const JWT = require( 'jsonwebtoken' );

module.exports = {
    generateToken: ( id, body ) => {
        return JWT.sign( {
            sub: id,
            body
        }, 'authenticationsecret(gottaBeReplaced)' );
    }
}