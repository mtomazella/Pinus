const { app }   = require( './src/app' );
const http      = require( 'http' ).Server( app );
const io        = require( 'socket.io' )( http );
const config    = require( './config.json' );

http.listen( config.serverPort, ( error ) => {
    if ( error ) throw error;
    console.log( 'API Started' );
} );

module.exports = {
    io
}