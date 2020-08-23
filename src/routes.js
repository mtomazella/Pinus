const { queryUsers, insertQuery, deleteQuery, updateQuery } = require( './database' );

module.exports = {  
    GET: ( table, request, response ) => {
        let query = ` SELECT * FROM ${table} `;
        if ( Object.keys( request.query )[0] != undefined ) query += ( ` WHERE ${Object.keys(request.query)[0]} = "${Object.values( request.query )[0]}"` );
        queryUsers( query, false )
        .then( ( users ) => {
            response.json( users );
        } )
        .catch( ( error ) => {
            response.json( { 'error': { errorCode: error.code, error: error.raw } } );
        } )
    },
    POST: ( table, request, response ) => {
        insertQuery( table, request.body )
        .then( user => {
            response.json( user );
        } )
        .catch( ( error ) => {
            response.json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    },
    PUT: ( table, request, response ) => {
        updateQuery( table, request.body.update, request.body.identifier, request.body.password )
        .then( ( result ) => {
            response.json( result );
        } )
        .catch( ( error ) => {
            response.json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    },
    DELETE: ( table, request, response ) => {
        deleteQuery( table, request.body.identifier, request.body.password )
        .then( ( result ) => {
            response.json( result );
        } )
        .catch( ( error ) => {
            response.json( { errorCode: error.code, error: error.raw } );
        } );
    }
}