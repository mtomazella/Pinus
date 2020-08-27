const express   = require( 'express' );
const app       = express( );
const bp        = require( 'body-parser' );
const { GET, POST, PUT, DELETE } = require( './routes' );
const { request, response } = require('express');

/* Midwares */

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

/* REST Routes */

        /* List */
    /*
        GET     ping    - Test connection           DONE
        GET     user    - return users              DONE
        GET     admin   - return admins             DONE
        GET     msg     - return messages           DONE
        GET     cont    - return contacts           DONE
        
        POST    admin   - add new admin             DONE
        POST    user    - add new user              DONE
        POST    msg     - add new message           DONE
        POST    cont    - add new contact           DONE
        
        PUT     user    - change info about user    DONE
        PUT     admin   - change info about admin   DONE

        DELETE  user    - delete user               DONE
        DELETE  admin   - delete admin              DONE
        DELETE  cont    - delete contact            autenticação não funciona com os contatos. Achar uma solução
    */

    /* GET */

        /* Ping */

        app.get( '/', ( request, response ) => {
            response.redirect( '/ping' );
        } );

        app.get( '/ping', ( request, response ) => {
            response.json( { connection: true } );
        } );

        /* Users */

        app.get( '/user', ( request, response ) => {
            GET( 'user', request, response );
        } )

        /* Admins */

        app.get( '/admin', ( request, response ) => {
            GET( 'admin', request, response );
        } )

        /* Message */

        app.get( '/msg', ( request, response ) => {
            GET( 'chat', request, response );
        } )

        /* Contact */

        app.get( '/cont', ( request, response ) => {
            GET( 'contact', request, response );
        } )

    /* POST */

        /* User */
        
        app.post( '/user', ( request, response ) => {
            POST( 'user', [ 'id', 'displayName', 'name', 'email', 'password' ], request, response );
        } )

        /* Admin */

        app.post( '/admin', ( request, response ) => {
            POST( 'admin', [ 'id', 'displayName', 'name', 'email', 'password', 'accessLevel' ], request, response );
        } )

        /* Message */

        app.post( '/msg', ( request, response ) => {
            request.body.datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
            POST( 'chat', [ 'id', 'idAdmin', 'idUser', 'datetime', 'sender', 'type', 'text', 'image' ], request, response );
        } )

        /* Contact */

        app.post( '/cont', ( request, response ) => {
            POST( 'contact', [ 'id', 'idAdmin', 'idUser' ], request, response );
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

        /* Contact */

        app.delete( '/cont', ( request, response ) => {
            DELETE( 'contact', request, response );
        } )

/* ------------ */

module.exports = { app };