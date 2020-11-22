const crypto = require( 'crypto' );
const process = require( 'process' );
//const config = require( './../config.json' );

module.exports = {
    encrypt: ( password ) => {
        return crypto.createHmac( 'sha256', process.env.HASH_SECRET ).update( password ).digest( 'hex' );
    }
}