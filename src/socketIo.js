const { insertQuery }   = require( './database' );
const databaseFields    = require( './databaseFields.json' );

class RealTimeHandler {

    supportQueue = [ ];

    clientSockets = {
        admin: { },
        user: { }
    }

    constructor ( server ) {

        const io = require( 'socket.io' )( server, 
            {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            } } );

        /* List */
    /* 
        RECEIVE supportRequest      - receives user support request DONE    NOT_TESTED
        RECEIVE setSocket           - save client socket            DONE    NOT_TESTED
        RECEIVE message             - receive message from socket   DONE    NOT_TESTED
        RECEIVE disconnect          - delete client socket          DONE    NOT_TESTED
        RECEIVE supportConnect      - connects a admin to a user    DONE    NOT_TESTED
        RECEIVE supportDisconnect   - deisconnect a support room    DONE    NOT_TESTED
        RECEIVE supportQueue        - returns the support queue     DONE    NOT_TESTED
    */

    /* WebSocket Routes */

        io.on( 'connect', ( socket ) => {

            console.log( 'User Connected' );
    
            /* RECEIVE setSocket */
    
            socket.on( 'setSocket', ( info ) => {
                clientSockets[ info.type ][ info.id ] = socket;
                socket.pinus.userType = info.type;
                if ( info.type == 'admin' ) socket.join( 'support' )
                else this.supportQueue.unshift( socket );
            } );
    
            /* RECEIVE disconnect */
    
            socket.on( 'disconnection', ( info ) => {
                console.log('user disconnected')
                if ( clientSockets[ info.type ][ info.id ] == socket ) delete clientSockets[ info.type ][ info.id ];
            } );
    
            /* RECEIVE message */
    
            socket.on( 'message', ( message ) => {
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

            /* RECEIVE supportRequest */

            socket.on( 'supportRequest', ( ) => {
                io.to( 'support' ).emit( 'supportRequest', { socket: socket } );
            } )

            /* RECEIVE supportQueue */

            socket.on( 'supportQueue', ( ) => {
                if ( socket.pinus.userType == 'admin' ) io.to( socket ).emit( 'supportQueue', this.supportQueue );
            } )

            /* RECEIVE supportConnect */

            socket.on( 'supportConnect', ( info ) => {
                for ( let i in this.supportQueue ) {
                    if ( this.supportQueue[i].id == info.userSocket.id ) this.supportQueue.splice( i, 1 );
                }
                io.to( info.userSocket.id ).emit( { supportSocket: socket } );
            } )

            /* RECEIVE supportDisconnect */

            socket.on( 'supportDisconnect', ( info ) => {
                io.to( info.otherSocket.id ).emit( 'supportDisconnect', info );
            } )
    
        } )

        return io;
    }
}

module.exports = { RealTimeHandler }
    
/* Functions */

String.prototype.capitalizeFirstChar = ( ) => {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
