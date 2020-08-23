const express   = require( 'express' );
const app       = express( );
//const mysql     = require( 'mysql' );
const config    = require( './config.json' );
const bp        = require( 'body-parser' );
const { GET, POST, PUT, DELETE } = require( './src/routes' );

/* Start API */

app.listen( config.serverPort, () => {
    console.log( "API started" );
} );
app.use( ( request, response, next ) => {
    request.header( 'Access-Control-Allow-Origin', '*' );
    request.header( 'Access-Control-Allow-Headers', '*' );
    if ( request.method === 'OPTIONS' ){
        response.header( 'Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE' )
        response.status(200).json({});
    }
    next();
} )
app.use( bp.json() );
app.use( bp.urlencoded( { extended: false } ) );

/* API Routes */

    /* GET */

        /* Ping */

        app.get( '/ping', ( request, response ) => {
            return response.json( { connection: true } );
        } );

        /* Users */

        app.get( '/user', ( request, response ) => {
            GET( 'user', request, response );
        } )

        /* Admins */

        app.get( '/admin', ( request, response ) => {
            GET( 'admin', request, response );
        } )

    /* POST */

        /* User */
        
        app.post( '/user', ( request, response ) => {
            POST( 'user', request, response );
        } )

        /* Admin */

        app.post( '/admin', ( request, response ) => {
            POST( 'admin', request, response );
        } )

    /* PUT */

        /* User */

        app.put( '/user', ( request, response ) => {
            PUT( 'user', request, response );
        } );

        /* Admin */

        app.put( '/admin', ( request, response ) => {
            PUT( 'admin', request, response );
        } );

    /* DELETE */

        /* User */

        app.delete( '/user', ( request, response ) => {
            DELETE( 'user' , request, response );
        } );

        /* Admin */

        app.delete( '/admin', ( request, response ) => {
            DELETE( 'admin', request, response );
        } );

/* ------------ */



/* Functions */

    // Routes

    /*function GET( table, request, response ){
        if ( Object.keys( request.query ).length == 0 ) response.json( { error: { errorCode: 'NO_AUTH_INFO', error: { desc: 'No authentication information sent' } } } );
        //if ( request.query.mode == 'admin' )
        let query = ` SELECT * FROM ${table} `;
        if ( Object.keys( request.query )[0] != undefined ) query += ( ` WHERE ${Object.keys(request.query)[0]} = "${Object.values( request.query )[0]}"` );
        queryUsers( query, false )
        .then( ( users ) => {
            response.json( users );
        } )
        .catch( ( error ) => {
            response.json( { 'error': { errorCode: error.code, error: error.raw } } );
        } )
    }

    function POST( table, request, response ){
        insertQuery( table, request.body )
        .then( user => {
            response.json( user );
        } )
        .catch( ( error ) => {
            response.json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    }

    function PUT( table, request, response ){
        updateQuery( table, request.body.update, request.body.identifier, request.body.password )
        .then( ( result ) => {
            response.json( result );
        } )
        .catch( ( error ) => {
            response.json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    }

    function DELETE( table, request, response ){
        deleteQuery( table, request.body.identifier, request.body.password )
        .then( ( result ) => {
            response.json( result );
        } )
        .catch( ( error ) => {
            response.json( { errorCode: error.code, error: error.raw } );
        } );
    }

    // Query

    function queryUsers( query, sendPassword ){
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

    function insertQuery( table, values ){
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( config.sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( 'CONNECTION_ERROR', error );
                let query = ' INSERT INTO ' + table + ' VALUES ( null, ?, ?, ?, ?';
                let numVal = 3;
                if ( table == 'admin' ){ 
                    query += ', ?';
                    numVal++;
                }
                query += ');'
                const valuesArray = [ ];
                const fields = [ 'displayName', 'name', 'email', 'password', 'accessLevel' ]
                for ( let i = 0; i <= numVal; i++ ){
                    let value = values[ fields[ i ] ];
                    if ( fields[ i ] == "password" ) value = encrypt( value );
                    valuesArray.push( value );
                }
                connection.query( query, valuesArray, ( error, Qres ) => {
                    if ( error || Qres == undefined ) reject( { code: 'QUERY_ERROR', raw: error } );
                    else{ 
                        connection.end();
                        resolve( queryUsers( `SELECT * FROM ${table} WHERE id = ${Qres.insertId}`, false ) );
                    }
                } );
            } )
        } )
    }

    function updateQuery( table, info, identifier, password ){
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( config.sqlConfig );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                if ( info == undefined ) reject( { code: 'UPT_UNDF', raw: { desc: 'No content in information object' } } );
                if ( identifier == undefined ) reject( { code: 'IDNT_UNDF', raw: { desc: 'No content in identification object' } } );
                authenticate( table, identifier, password )
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
                            resolve( queryUsers( `SELECT * FROM ${table} WHERE ${Object.keys(identifier)[0]} = "${Object.values(identifier)[0]}"`, false ) );
                        }
                    } )
                } )
                .catch( ( error ) => { 
                    reject( { code: 'AUTH_ERROR', raw: error } ) 
                } );
            } )
        } )
    }

    function deleteQuery( table, identifier, password ){
        return new Promise( ( resolve, reject ) => {
            const connection = mysql.createConnection( config.sqlConfig );
            connection.connect( ( error ) => {
                authenticate( table, identifier, password )
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
            queryUsers( query, false )
            .then( ( result ) => {
                resolve( result );
            } )
            .catch( ( error ) => {
                reject( error );
            } );
        } )
    }

    // Crypto

    function encrypt( password ){
        return crypto.createHmac( 'sha256', config.secret ).update( password ).digest( 'hex' );
    }*/