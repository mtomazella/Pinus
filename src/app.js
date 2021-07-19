require('dotenv').config({
    path: ( process.env.NODE_ENV === 'test' ) ? '.env.test' : '.env'
});
const express           = require( 'express' );
const app               = express( );
const bp                = require( 'body-parser' );
const CORS              = require( 'cors' );
const databaseFields    = require( './databaseFields.json' );
const { LOGIN, GET, POST, PUT, DELETE, DELETEcont, POSTvolunteer, GETvolunteer } = require( './routes' );
const { fetchQuery }                                = require( './database' );
const authMid = require( './authenticationMiddleware' );

/* Middlewares */

app.use( CORS( ) );
app.use( bp.json() );
app.use( bp.urlencoded( { extended: false } ) );
app.use( authMid );

/* REST Routes */

        /* List */
    /*
        GET     ping        - Test connection                   DONE
        GET     user        - returns users                     DONE
        GET     admin       - returns admins                    DONE
        GET     msg         - returns messages                  DONE
        GET     cont        - returns contacts                  DONE
        GET     comp        - returns component                 DONE
        GET     volunt      - returns volunteers                DONE
        
        POST    login       - returns token after validation    DONE
        POST    admin       - add new admin                     DONE
        POST    user        - add new user                      DONE
        POST    msg         - add new message                   DONE
        POST    cont        - add new contact                   DONE
        POST    comp        - add component                     DONE
        POST    comp/prov   - add provider to comp              DONE
        POST    volunt      - add volunteer                     DONE
        
        PUT     user        - change info about user            DONE
        PUT     admin       - change info about admin           DONE
        PUT     comp        - change info about comp            DONE
        PUT     comp/prov   - change info about prov            DONE
        PUT     volunt      - change info about volunteer       DONE

        DELETE  user        - delete user                       DONE
        DELETE  admin       - delete admin                      DONE
        DELETE  cont        - delete contact                    DONE
        DELETE  comp        - delete component                  DONE
        DELETE  comp/prov   - delete component prov             DONE
        DELETE  volunt      - delete volunteer                  DONE
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

        /* Component */

        app.get ( '/comp', ( request, response ) => {
            GET( 'component', request, response );
        } )

            /* Provider */

            app.get( '/comp/prov', ( request, response ) => {
                GET( 'provider', request, response );
            } )

        /* Volunteer */

        app.get( "/volunt", ( request, response ) => {
            GETvolunteer( request, response );
        } )

    /* POST */

        /* Login */
        app.post( '/login', async ( request, response ) => {
            LOGIN( request, response );
        } )

        /* User */
        
        app.post( '/user', ( request, response ) => {
            POST( 'user', databaseFields.user, request, response );
        } )

        /* Admin */

        app.post( '/admin', ( request, response ) => {
            POST( 'admin', databaseFields.admin, request, response );
        } )

        /* Message */

        app.post( '/msg', async ( request, response ) => {
            if ( !isValidMessage( request.body ) ) {
                response.status(500).json( { error: { code: 'INVALID_MSG' } } );
                return;
            } 
            userAndAdminExist( request )
            .then( ( ) => {
                request.body.datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
                POST( 'chat', databaseFields.chat, request, response );
            } )
            .catch( ( ) => {
                response.status(500).json( { code: 'ADM_USER_UNDF', raw: { desc: "No User/Admin found." } } );
            } );
        } )

        /* Contact */

        app.post( '/cont', ( request, response ) => {
            userAndAdminExist( request )
            .then( ( ) => {
                POST( 'contact', databaseFields.contact, request, response );
            } )
            .catch( ( ) => {
                response.json( { code: 'ADM_USER_UNDF', raw: { desc: "No User/Admin found." } } );
            } );
        } )

        /* Component */

        app.post( '/comp', ( request, response ) => {
            POST( 'component', databaseFields.component, request, response );
        } )

            /* Provider */

            app.post( '/comp/prov', async ( request, response ) => {
                request.body.idComp = await getComponentId( request.body );
                POST( 'provider', databaseFields.provider, request, response );
            } )

        /* Volunteer */

        app.post( "/volunt", ( request, response ) => {
            POSTvolunteer( 'volunteer', databaseFields.volunteer, request, response );
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

        /* Component */

        app.put( '/comp', async ( request, response ) => {
            if ( !request.body.identifier.id ) {
                response.status(500).json( { error: { code: "COMP_ID_UNDF", raw: { desc: "The identifier to a component must be an id" } } } );
                return;
            }
            PUT( 'component', request, response );
        } );

            /* Provider */

            app.put( '/comp/prov', async ( request, response ) => {
                if ( request.body.identifier.nameComp ) { 
                    request.body.identifier.idComp = await getComponentId( request.body.identifier ).catch( error => response.status(500).json( error ) );
                    delete request.body.identifier.nameComp;
                }
                PUT( 'provider', request, response );
            } )

        /* Volunteer */

        app.put( "/volunt", ( request, response ) => {
            PUT( 'volunteer', request, response );
        } )

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
            DELETEcont( request, response );
        } );

        /* Component */

        app.delete( '/comp', ( request, response ) => {
            DELETE( 'component', request, response );
        } );

            /* Provider */ 

            app.delete( '/comp/prov', ( request, response ) => {
                DELETE( 'provider', request, response );
            } )

        /* Volunteer */

        app.delete( "/volunt", ( request, response ) => {
            DELETE( 'volunteer', request, response );
        } )

/* ------------ */

module.exports = { app, isValidMessage };

/* Created Functions */

function userAndAdminExist ( request ) {
    return new Promise ( async ( resolve, reject ) => {
        const userExists = await fetchQuery( `SELECT * FROM user WHERE id = "${request.body.idUser}"`, false )
        .then( ( user ) => {
            return user[0] != undefined;
        } )
        .catch( (err) => console.log(err));
        const adminExists = await fetchQuery( `SELECT * FROM admin WHERE id = "${request.body.idAdmin}"`, false )
            .then( ( admin ) => {
                return admin[0] != undefined;
            } )
            .catch( (err) => console.log(err))

        if ( adminExists && userExists ) resolve()
        else reject();
    } )
}

function getComponentId ( request ) {
    return new Promise( ( resolve, reject ) => {
        let identifier = 'id';
        if ( !request.idComp ) 
            if( !request.nameComp ) 
                reject( { code: "NO_COMP_IDENT", raw: { desc: "No component identifier (name / id)" } } );
            else identifier = 'name';
        fetchQuery( `SELECT id FROM component WHERE ${identifier} = "${identifier == 'id' ? request.idComp : request.nameComp}"` )
        .then( ( id ) => {
            if ( !id[0] ) reject( { code: "COMP_UNDF", raw: { desc: "Component undefined" } } );
            else resolve( id[0].id );
        } )
        .catch( ( error ) => {
            reject( { code: error.errorCode, raw: error } );
        } )
    } )
}

function isValidMessage ( message ) {
    return ( message.type == 'text' && message.text.trim() !== '' && message.text !== undefined );
}