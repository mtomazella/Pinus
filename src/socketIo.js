const { insertQuery, fetchQuery }       = require( './database' );
const databaseFields                    = require( './databaseFields.json' );
const { isValidMessage }                = require( './app' );

class RealTimeHandler {

    supportQueue = [ ];

    clientSockets = {
        admin: { },
        user: { }
    }

    io;

    constructor ( server ) {

        const io = require( 'socket.io' )( server, 
            {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            } } );

        /* List */
    /* 
        BROADCAST   supportQueue        - broadcasts supportQueue       DONE    

        SEND        supportQueue        - sends supportQueue admin      DONE   
        SEND        reportError         - sends an error                DONE 

        CHAT        messageLoad         - send old messages to chat     DONE

        RECEIVE     supportRequest      - receives user support request DONE    
        RECEIVE     setSocket           - save client socket            DONE    
        RECEIVE     message             - receive message from socket   DONE    
        RECEIVE     messageLoad         - request for messageLoad       DONE   
        RECEIVE     disconnect          - delete client socket          TODO    CANCELED
        RECEIVE     supportConnect      - connects a admin to a user    DONE    
        RECEIVE     supportDisconnect   - deisconnect a support room    DONE    
        RECEIVE     supportQueue        - returns the support queue     DONE    
    */

    /* WebSocket Routes */

        io.on( 'connect', ( socket ) => {

            //console.log( 'User Connected' );
    
            /* RECEIVE setSocket */
    
            socket.on( 'setSocket', ( info ) => {
                try {
                    this.clientSockets[ info.type ][ info.id ] = socket;
                    socket.user = { type: info.type, id: info.id, name: info.name };
                    if ( info.type == 'admin' ) socket.join( 'support' )
                } catch ( error ) {
                    console.log( 'setSocket error', error )
                }
            } );
    
            /* RECEIVE disconnect */
    
            socket.on( 'disconnect', ( ) => {
                //console.log('user disconnected - Apagar socket retirado')
                //if ( this.clientSockets[ socket.pinus.userType ][ socket.pinus.userId ] == socket ) delete this.clientSockets[ socket.pinus.userType ][ socket.pinus.userId ];
            } );
    
            /* RECEIVE message */
    
            socket.on( 'message', ( info ) => {
                if ( !isValidMessage( info.message ) ) {
                    this.send_reportError( socket, { error: { code: 'INVALID_MSG' } } );
                    return;
                } 
                info.message.datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
                // Sending Message
                try {
                    const destinationType   = ( info.message.sender == 'user' ) ? 'admin' : 'user';
                    const destinationId     = info.message[ `id${capitalizeFirstChar(destinationType)}` ];
                    const destinationSocket = this.clientSockets[ destinationType ][ destinationId ];
                    if ( destinationSocket.id == info.otherSocketId ) io.to(destinationSocket.id).emit( 'message', info.message ); 
                } catch ( error ) {
                    console.log( error );
                }
                // Inserting into database
                insertQuery( 'chat', info.message, databaseFields.chat )
                .catch( ( error ) => {
                    console.log( `Amigo, mil desculpas, mas a mensagem não foi gravada e a gente não vai tentar de novo: 
                    ${error}` );
                } )
            } )

            /* RECEIVE messageLoad */
            socket.on( 'messageLoad', ( chat ) => {
                this.chat_messageLoad( chat.user, chat.support );
            } )

            /* RECEIVE supportRequest */

            socket.on( 'supportRequest', ( ) => {
                if ( !socket.user.type == 'user' || this.supportQueue.indexOf( socket.id ) !== -1 ) return;
                for ( let i = this.supportQueue.length-1; i >= 0; i-- ) if ( this.supportQueue[i].userId == socket.user.id ) this.supportQueue.splice( i, 1 )
                this.supportQueue.push( { socketId: socket.id, userId: socket.user.id, name: socket.user.name } );
                this.broadcast_supportQueue();
            } )

            /* RECEIVE supportQueue */

            socket.on( 'supportQueue', ( ) => {
                this.send_supportQueue( socket );
            } )

            /* RECEIVE supportConnect */

            socket.on( 'supportConnect', ( info ) => {
                for ( let i = this.supportQueue.length-1; i >= 0; i-- ) {
                    if ( this.supportQueue[i] == info.socketId ) this.supportQueue.splice( i, 1 );
                }
                const chatInfo = { support: { socketId: socket.id, supportId: socket.user.id, name: socket.user.name }, user: { socketId: info.socketId, userId: info.userId } };
                io.to( info.socketId ).emit( 'supportConnect', chatInfo );
                this.chat_messageLoad( chatInfo.user, chatInfo.support );
            } )

            /* RECEIVE supportDisconnect */

            socket.on( 'supportDisconnect', ( info ) => {
                io.to( info.otherUserInfo.socketId ).emit( 'supportDisconnect', { otherUserInfo: info.userInfo, userInfo: info.otherUserInfo } );
                console.log( { otherUserInfo: info.userInfo, userInfo: info.otherUserInfo } )
            } )
        } )

        this.io = io;
        return io;
    }

    /* SEND supportQueue */
    send_supportQueue ( socket ) {
        if ( !socket.user || socket.user.type == 'admin' ) this.io.to( socket.id ).emit( 'supportQueue', this.supportQueue );
    }

    /* SEND reportError */
    send_reportError ( socket, error ) { 
        this.io.to( socket.id ).emit( error );
    }
    
    /* CHAT messageLoad */
    chat_messageLoad ( user, support ) {
        fetchQuery( `SELECT * FROM chat WHERE idUser = ${user.userId} AND idAdmin = ${support.supportId}`, false )
        .then( ( messages ) => {
            this.io.to( user.socketId    ).emit( 'messageLoad', messages );
            this.io.to( support.socketId ).emit( 'messageLoad', messages );
        } )
        .catch( ( error ) => {
            console.log( error );
        } )
    }

    /* BROADCAST supportQueue */
    broadcast_supportQueue ( ) { 
        this.io.to( 'support' ).emit( 'supportQueue', this.supportQueue );
    }
}

module.exports = { RealTimeHandler }
    
/* Functions */

function capitalizeFirstChar ( string ) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}