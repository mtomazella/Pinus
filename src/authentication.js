const crypto    = require( 'crypto' );
const process   = require( 'process' );
const jwt       = require( 'jsonwebtoken' );

module.exports = {
    encrypt: ( password ) => {
        return crypto.createHmac( 'sha256', process.env.HASH_SECRET ).update( password ).digest( 'hex' );
    },
    generateToken: ( userId,userType ) => {
        return jwt.sign( { id: userId, type: userType }, process.env.JWT_HASH, { expiresIn: 86400 } );
    },
    validateToken: ( token ) => {
        return new Promise ( ( resolve, reject ) => {
            jwt.verify( token, process.env.JWT_HASH, ( error, decoded ) => {
                if ( error ) reject( error );
                else resolve( decoded );
            } );
        } )
    }
}