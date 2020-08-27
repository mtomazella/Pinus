const mysql = require( 'mysql' );
const config = require( './../config.json' );
const { encrypt } = require( './authentication' )

function fetchQuery( query, sendPassword ){
    return new Promise( ( resolve, reject ) => {
        const connection = mysql.createConnection( config.sqlConfig );
        connection.connect( ( error ) => {
            if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
            connection.query( query, ( error, Qres ) => {
                if ( error ) reject( { code: 'QUERY_ERROR', raw: error } );
                const users = [ ];
                for ( let i in Qres ){
                    users.push( Qres[ i ] );
                    if ( !sendPassword ) users[ users.length-1 ].password = undefined;
                }
                connection.end();
                resolve( users );
            } );
        } )
    } );
}

function authenticateCredentials( table, identifier, password ){
    return new Promise( ( resolve, reject ) => {
        if ( password == undefined ) reject( { errorCode: 'PASSWORD_UNDF', raw: { desc: 'Undefined password' } } );
        if ( identifier.email == undefined && identifier.id == undefined && identifier.displayName == undefined ) reject( { errorCode: 'NO_UNQ_IDENT', raw: { desc: 'No unique identifier' } } );
        let query = `SELECT id FROM ${table} WHERE password = "${encrypt(password)}"`
        const keys = Object.keys( identifier );
        const values = Object.values( identifier );
        for ( let i in keys ){
            query += ` AND ${keys[i]} = "${values[i]}"`;
        }
        fetchQuery( query, false )
        .then( ( result ) => {
            resolve( result );
        } )
        .catch( ( error ) => {
            reject( error );
        } );
    } )
}

module.exports = {
    fetchQuery,
    insertQuery: ( table, values, fields ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( config.sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( 'CONNECTION_ERROR', error );
                let query = ` INSERT INTO ${table} VALUES ( ?`;
                const valuesArray = [ ];
                for ( let i = 0; i <= fields.length-1; i++ ){
                    if ( i != 0 ) query += ', ?';
                    let value = values[ fields[ i ] ];
                    if ( fields[ i ] == "password" ) value = encrypt( value );
                    valuesArray.push( value );
                }
                query += ');'
                connection.query( query, valuesArray, ( error, Qres ) => {
                    if ( error || Qres == undefined ) reject( { code: 'QUERY_ERROR', raw: error } );
                    else{ 
                        connection.end();
                        resolve( fetchQuery( `SELECT * FROM ${table} WHERE id = ${Qres.insertId}`, false ) );
                    }
                } );
            } )
        } )
    },
    updateQuery: ( table, info, identifier, password ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( config.sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                if ( info == undefined ) reject( { code: 'UPT_UNDF', raw: { desc: 'No content in information object' } } );
                if ( identifier == undefined ) reject( { code: 'IDNT_UNDF', raw: { desc: 'No content in identification object' } } );
                authenticateCredentials( table, identifier, password )
                .then( ( id ) => {
                    const keys = Object.keys( info );
                    const values = Object.values( info );
                    let query = `UPDATE ${table} SET ${keys[0]} = "${values[0]}"`
                    for ( let i in keys ){
                        if ( i == 0 ) continue;
                        query += ` , ${keys[i]} = "${values[i]}"`
                    }
                    query += ` WHERE id = "${id[0].id}";`
                    connection.query( query, ( error ) => {
                        if ( error ) reject( { code: 'QUERY_ERROR', raw: error } );
                        else{
                            connection.end(); 
                            resolve( fetchQuery( `SELECT * FROM ${table} WHERE ${Object.keys(identifier)[0]} = "${Object.values(identifier)[0]}"`, false ) );
                        }
                    } )
                } )
                .catch( ( error ) => { 
                    console.log(error)
                    reject( { code: 'AUTH_ERROR', raw: error } ) 
                } );
            } )
        } )
    },
    deleteQuery: ( table, identifier, password ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( config.sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                authenticateCredentials( table, identifier, password )
                .then( ( id ) => {
                    const query = `DELETE FROM ${table} WHERE id = ${id[0].id}`
                    connection.query( query, ( error, Qres ) => {
                        if ( error ) reject( { code: 'QUERY_ERROR', raw: error } );
                        else if ( Qres.affectedRows == 0 ) reject( { code: 'USER_NOT_FOUND', raw: { desc: 'Required user not found' } } );
                        else{ 
                            connection.end();
                            resolve( { code: 'DONE' } );
                        }
                    } )
                } )
                .catch( ( error ) => {
                    reject( { code: 'AUTH_ERROR', raw: error } );
                } );
            } )
        } )
    },
    authenticateCredentials
}