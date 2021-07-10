const mysql                 = require( 'mysql' );
const process               = require( 'process' )
const { encrypt, decrypt }  = require( './authentication' );
const sqlConfig     = {
    port:       process.env.SQL_PORT,
    database:   process.env.SQL_DB,
    host:       process.env.SQL_HOST,
    user:       process.env.SQL_USER,
    password:   process.env.SQL_PASS
}

function fetchQuery( query, sendPassword ){
    return new Promise( ( resolve, reject ) => {
        const connection = mysql.createConnection( sqlConfig );
        connection.connect( ( error ) => {
            if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
            connection.query( query, ( error, Qres ) => {
                if ( error ) reject( { code: 'QUERY_ERROR', raw: error } );
                if ( !sendPassword && Qres != undefined ) Qres.forEach( user => {
                    user.password = undefined;
                });
                if ( Qres )
                    Qres.forEach( user => {
                        user.password = undefined;
                    });
                connection.end();
                resolve( Qres );
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

function elementExists ( table, identifier ) {
    return new Promise( ( resolve, reject ) => {
        if ( identifier.email == undefined && identifier.id == undefined ) reject( { errorCode: 'NO_UNQ_IDENT', raw: { desc: 'No unique identifier' } } );
        const keys = Object.keys( identifier );
        let query = `SELECT id FROM ${table} WHERE ${keys[0]} = "${identifier[keys[0]]}"`;
        keys.shift( );
        keys.forEach( key => {
            query += ` AND ${key} = "${identifier[key]}"`;
        } );
        fetchQuery( query )
        .then( ( result ) => {
            if ( result ) resolve( result[0] );
            else          resolve( undefined );
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
            const connection = mysql.createConnection( sqlConfig );
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
    insertVolunteer: ( table, values, fields ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( sqlConfig );
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
                        resolve( fetchQuery( `SELECT * FROM ${table} WHERE id = ${values.id}`, false ) );
                    }
                } );
            } )
        } )
    },
    updateQuery: ( table, info, identifier, password ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( sqlConfig );
            connection.connect( ( error ) => {
                if ( error )                    reject( { code: 'CONNECTION_ERROR', raw: error } );
                if ( info == undefined )        reject( { code: 'UPT_UNDF', raw: { desc: 'No content in information object' } } );
                if ( identifier == undefined )  reject( { code: 'IDNT_UNDF', raw: { desc: 'No content in identification object' } } );

                elementExists( table, identifier )
                .then( ( element ) => {
                    if ( !element ) reject( { code: 'ELEMENT_UNDF', raw: { desc: "Element not found." } } )
                    const keys = Object.keys( info );
                    let query = `UPDATE ${table} SET ${keys[0]} = "${info[keys[0]]}"`
                    keys.shift( );
                    keys.forEach( key => {
                        query += ` , ${key} = "${info[key]}"`;
                    } )
                    query += ` WHERE id = "${element.id}";`
                    connection.query( query, ( error ) => {
                        if ( error ) reject( { code: 'QUERY_ERROR', raw: error } );
                        else{
                            connection.end( ); 
                            resolve( fetchQuery( `SELECT * FROM ${table} WHERE id = "${element.id}"` ) );
                        }
                    } )
                } )
                .catch( ( error ) => { 
                    console.log(error)
                    reject( { code: 'QUERY_ERROR', raw: error } ) 
                } );
            } )
        } )
    },
    deleteQuery: ( table, identifier ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                elementExists( table, identifier )
                .then( ( element ) => {
                    if ( !element ) reject( { code: 'ELEMENT_UNDF', raw: { desc: "Element not found." } } )
                    const query = `DELETE FROM ${table} WHERE id = ${element.id}`
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
                    reject( { code: 'QUERY_ERROR', raw: error } );
                } );
            } )
        } )
    },
    deleteContact: ( request ) => {
        return new Promise( ( resolve, reject ) => {
            const password = request.body.password;
            const identifier = request.body.from;
            let table = 'user';
            if ( identifier.idAdmin || identifier.emailAdmin ) table = 'admin';
            let collum;
            if ( Object.keys(identifier)[0].search( 'id' ) != -1 ) collum = 'id'
            else if ( Object.keys(identifier)[0].search( 'email' ) != -1 ) collum = 'email';
            else reject( { code: 'NO_FROM_IDENT', raw: { desc: 'No identifier from host user received' } } );
            const query = `SELECT id FROM ${table} WHERE password = "${encrypt(password)}" AND ${collum} = "${Object.values( identifier )[0]}"`;
            fetchQuery( query, false )
            .then( ( ) => {
                const connection = mysql.createConnection( sqlConfig );
                connection.connect( ( error ) => {
                    if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                    connection.query( `DELETE FROM contact WHERE ${Object.keys(request.body.identifier)[0]} = ${Object.values(request.body.identifier)[0]}` );
                    connection.end();
                } );
                fetchQuery( `SELECT * FROM contact WHERE ${Object.keys(identifier)[0]} = ${Object.values(identifier)[0]}`, false )
                .then( ( result ) => {
                        resolve( result );
                    }
                )
                .catch( ( error ) => {
                    reject( error );
                } )
            } )
            .catch( ( error ) => {
                reject( { code: 'AUTH_ERROR', raw: error } );
            } );
        } );
    },
    authenticateCredentials
}