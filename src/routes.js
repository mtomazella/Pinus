const { fetchQuery, insertQuery, deleteQuery, updateQuery, updateNoPassword, deleteContact, deleteNoPassword } = require( './database' );
const { encrypt, generateToken } = require( './authentication' );

module.exports = {  
    LOGIN: ( request, response ) => {
        if ( !request.body.email ) { 
            response.status(500).json( { 'error': { errorCode: 'AUTH_ERR', error: 'Email required' } } );
            return;
        }
        if ( !request.body.password ) { 
            response.status(500).json( { 'error': { errorCode: 'AUTH_ERR', error: 'Password required' } } );
            return;
        }
        request.body.password = encrypt( request.body.password );
        fetchQuery( `SELECT * FROM ${request.body.type} WHERE email = '${request.body.email}' AND password = '${request.body.password}'`, false )
        .then( ( user ) => {
            if ( user[0] === undefined ) { 
                response.status(500).json( { 'error': { errorCode: 'AUTH_ERR', error: 'User not found / Wrong password' } } );
                return;
            }
            user = user[0];
            user.type = request.body.type;
            const token = generateToken( user.id, user.type );
            response.status(200).json( { user, token } );
        } )
        .catch( error => {
            response.status(500).json( { 'error': { errorCode: error.code, error: error } } );
            return;
        } )
    },
    GET: ( table, request, response ) => {
        let query = ` SELECT * FROM ${table} `;
        if ( Object.keys( request.query )[0] != undefined ){ 
            if ( request.query.password ) request.query.password = encrypt( request.query.password );
            const keys      = Object.keys(request.query);
            const values    = Object.values( request.query );
            query += ( ` WHERE ${keys[0]} = "${values[0]}"` );
            keys.shift(); 
            values.shift();
            for ( let i in keys ) {
                query += ` AND ${keys[i]} = "${values[i]}"`;
            }
        }
        fetchQuery( query, false )
        .then( ( users ) => {
            response.status(200).json( users );
        } )
        .catch( ( error ) => {
            response.status(500).json( { 'error': { errorCode: error.code, error: error.raw } } );
        } )
    },
    POST: ( table, fields, request, response ) => {
        insertQuery( table, request.body, fields )
        .then( user => {
            response.status(200).json( user );
        } )
        .catch( ( error ) => {
            response.status(500).json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    },
    PUT: ( table, request, response ) => {
        updateQuery( table, request.body.update, request.body.identifier, request.body.password )
        .then( ( result ) => {
            response.status(200).json( result );
        } )
        .catch( ( error ) => {
            response.status(500).json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    },
    PUTnoPassword: ( table, request, response ) => {
        updateNoPassword( table, request.body.update, request.body.identifier )
        .then( ( result ) => {
            response.status(200).json( result );
        } )
        .catch( ( error ) => {
            response.status(500).json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    },
    DELETE: ( table, request, response ) => {
        deleteQuery( table, request.body.identifier, request.body.password )
        .then( ( result ) => {
            response.status(200).json( result );
        } )
        .catch( ( error ) => {
            response.status(500).json( { errorCode: error.code, error: error.raw } );
        } );
    },
    DELETEcont: ( request, response ) => {
        deleteContact( request )
        .then( ( result ) => {
            response.status(200).json( result );
        } )
        .catch( ( error ) => {
            console.log(error)
            response.status(500).json( { errorCode: error.code, error: error.raw } );
        } )
    },
    DELETEnoPassword: ( table, identifier, response ) => {
        deleteNoPassword( table, identifier )
        .then( ( result ) => {
            response.status(200).json( result );
        } )
        .catch( ( error ) => {
            console.log(error)
            response.status(500).json( { errorCode: error.code, error: error.raw } );
        } )
    }
}