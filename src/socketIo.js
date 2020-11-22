const { io }            = require( './../server' );
const { insertQuery }   = require( './database' );
const databaseFields    = require( './databaseFields.json' );

/* WebSocket Routes */

    const clientSockets = {
        admin: { },
        user: { }
    }

        /* List */
    /* 
        SEND    message     - send message to socket        TODO    CANCELED

        RECEIVE setSocket   - save client socket            DONE    NOT_TESTED
        RECEIVE message     - receive message from socket   DONE    NOT_TESTED
        RECEIVE disconnect  - delete client socket          DONE    NOT_TESTED
    */

    io.on( 'connection', ( socket ) => {

        /* RECEIVE setSocket */

        io.on( 'setSocket', ( info ) => {
            clientSockets[ info.type ][ info.id ] = socket;
        } );

        /* RECEIVE disconnect */

        io.on( 'disconnect', ( info ) => {
            if ( clientSockets[ info.type ][ info.id ] == socket ) delete clientSockets[ info.type ][ info.id ];
        } );

        /* RECEIVE message */

        io.on( 'message', ( message ) => {
            // Sending Message
            const destinationType   = ( message.sender == 'user' ) ? 'admin' : 'user';
            const destinationId     = message[ `id${destinationType.capitalizeFirstChar()}` ];
            const destinationSocket = clientSockets[ destinationType ][ destinationId ];
            if ( destinationSocket ) io.to(destinationSocket).emit( 'message', message ); 
            // Inserting into database
            insertQuery( 'chat', message, databaseFields.chat )
            .catch( ( error ) => {
                console.log( `Amigo, mil desculpas, mas a mensagem não foi gravada e a gente não vai tentar de novo: 
                ${error}` );
            } )
        } )

    } )

    /* Functions */

    String.prototype.capitalizeFirstChar = ( ) => {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

/* ------------ */