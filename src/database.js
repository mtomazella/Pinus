const mysql         = require( 'mysql' );
const process       = require( 'process' )
const { encrypt }   = require( './authentication' );
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
    updateQuery: ( table, info, identifier, password ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                if ( info == undefined ) reject( { code: 'UPT_UNDF', raw: { desc: 'No content in information object' } } );
                if ( identifier == undefined ) reject( { code: 'IDNT_UNDF', raw: { desc: 'No content in identification object' } } );
                authenticateCredentials( table, identifier, password )
                .then( ( id ) => {
                    if ( id[0] == undefined ) reject( { code: 'ADM_USER_UNDF', raw: { desc: "No User/Admin found." } } )
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
    updateNoPassword: ( table, info, identifier ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                if ( info == undefined ) reject( { code: 'UPT_UNDF', raw: { desc: 'No content in information object' } } );
                if ( identifier == undefined ) reject( { code: 'IDNT_UNDF', raw: { desc: 'No content in identification object' } } );
                const keys = Object.keys( info );
                const values = Object.values( info );
                let query = `UPDATE ${table} SET ${keys[0]} = "${values[0]}"`
                for ( let i in keys ){
                    if ( i == 0 ) continue;
                    query += ` , ${keys[i]} = "${values[i]}"`
                }
                query += ` WHERE ${Object.keys(identifier)[0]} = "${Object.values(identifier)[0]}";`;
                connection.query( query, ( error ) => {
                    if ( error ) reject( { code: 'QUERY_ERROR', raw: error } );
                    else{
                        connection.end(); 
                        resolve( fetchQuery( `SELECT * FROM ${table} WHERE ${Object.keys(identifier)[0]} = "${Object.values(identifier)[0]}"`, false ) );
                    }
                } )
            } )
        } )
    },
    deleteQuery: ( table, identifier, password ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( sqlConfig );
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
    deleteNoPassword: ( table, identifier ) => {
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } )
                const keys   = Object.keys( identifier );
                const values = Object.values( identifier );
                const query = `DELETE FROM ${table} WHERE ${keys[0]} = "${values[0]}"`;
                for ( let i in keys ) {
                    if ( i == 0 ) continue;
                    query += ` AND ${keys[i]} = ${values[i]}`;
                }
                connection.query( query, ( error, Qres ) => {
                    if ( error ) reject( { code: 'QUERY_ERROR', raw: error } );
                    else if ( Qres.affectedRows == 0 ) reject( { code: 'ELEM_NOT_FOUND', raw: { desc: 'Element not found' } } );
                    else{ 
                        connection.end();
                        resolve( { code: 'DONE' } );
                    }
                } )
            } )
        } )
    },
    authenticateCredentials
}