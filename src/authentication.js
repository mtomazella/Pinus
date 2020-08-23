const { queryUsers } = require( './database' );
const crypto = require( 'crypto' );
const config = require( './../config.json' );

function encrypt( password ){
    return crypto.createHmac( 'sha256', config.secret ).update( password ).digest( 'hex' );
}

module.exports = {
    authenticateCredentials: ( table, identifier, password ) => {
        return new Promise( ( resolve, reject ) => {
            if ( password == undefined ) reject( { errorCode: 'PASSWORD_UNDF', raw: { desc: 'Undefined password' } } );
            if ( identifier.email == undefined && identifier.id == undefined && identifier.displayName == undefined ) reject( { errorCode: 'NO_UNQ_IDENT', raw: { desc: 'No unique identifier' } } );
            let query = `SELECT id FROM ${table} WHERE password = "${encrypt(password)}"`
            const keys = Object.keys( identifier );
            const values = Object.values( identifier );
            for ( let i in keys ){
                query += ` AND ${keys[i]} = "${values[i]}"`;
            }
            queryUsers( query, false )
            .then( ( result ) => {
                resolve( result );
            } )
            .catch( ( error ) => {
                reject( error );
            } );
        } )
    },
    encrypt
}