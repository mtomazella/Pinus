require('dotenv').config();
const process   = require( 'process' );
const { app }   = require( './src/app' );
const http      = require( 'http' ).Server( app );
const { RealTimeHandler } = require( './src/socketIo' );

http.listen( process.env.PORT || 3305, ( error ) => {
    if ( error ) throw error;
    console.log( 'API Started' );
} );

new RealTimeHandler( http );