const mysql = require("mysql");

const { fetchQuery, insertQuery, deleteQuery, updateQuery, deleteContact, insertVolunteer, fetchVolunteer } = require( './database' );
const { encrypt, generateToken } = require( './authentication' );
const databaseFields = require( './databaseFields.json' );

mysql.conn

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
        let query = `SELECT * FROM ${table} `;
        let orderBy;
        const values = [];
        
        // Get order, if existent, and delete to not interfeer
        if ( request.query && request.query.order ) { orderBy = request.query.order; delete request.query.order; };

        const keys = Object.keys( request.query );
        if ( keys[0] ) { 
            if ( request.query.password ) request.query.password = encrypt( request.query.password );
            const where = [];
            keys.forEach( key => {
                where.push( `${key} = ?` );
                values.push( request.query[key] );
            } );
            query += 'WHERE ' + where.join(" AND ");
        }
        if ( orderBy ) query += 'ORDER BY ' + orderBy;

        fetchQuery( mysql.format( query, values ), false )
        .then( ( users ) => {
            response.status(200).json( users );
        } )
        .catch( ( error ) => {
            response.status(500).json( { 'error': { errorCode: error.code, error: error.raw } } );
        } )
    },
    GETvolunteer: ( request, response ) => {
        let query = `SELECT v.id, v.isInstitution, v.nameVisibility, v.contactEmail, v.whatsapp, v.country, v.state, v.city, v.descr, u.name FROM volunteer v INNER JOIN user u ON v.id = u.id `;
        let orderBy;
        const values = [];

        if ( request.query && request.query.order ) { orderBy = request.query.order; delete request.query.order; };

        const keys = Object.keys( request.query );
        if ( keys[0] ) {
            if ( request.query.password ) request.query.password = encrypt( request.query.password );
            const where = [];
            keys.forEach( key => {
                where.push( `${key} = ?` );
                values.push( request.query[key] );
            } );
            query += 'WHERE ' + where.join(" AND ");
        }
        if ( orderBy ) query += `ORDER BY ${orderBy};`;
        
        fetchVolunteer( mysql.format( query, values ) )
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
    POSTvolunteer: ( table, fields, request, response ) => {
        insertVolunteer( table, request.body, fields )
        .then( user => {
            response.status(200).json( user );
        } )
        .catch( ( error ) => {
            response.status(500).json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    },
    PUT: ( table, request, response ) => {
        updateQuery( table, request.body.update, request.body.identifier )
        .then( ( result ) => {
            response.status(200).json( result );
        } )
        .catch( ( error ) => {
            response.status(500).json( { error: { errorCode: error.code, error: error.raw } } );
        } )
    },
    DELETE: ( table, request, response ) => {
        deleteQuery( table, request.body.identifier )
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
