const { fetchQuery, insertQuery, deleteQuery, updateQuery, deleteContact } = require( './database' );
const { request, response } = require('express');

module.exports = {  
    GET: ( table, request, response ) => {
        let query = ` SELECT * FROM ${table} `;
        if ( Object.keys( request.query )[0] != undefined ){ 
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
    }
}