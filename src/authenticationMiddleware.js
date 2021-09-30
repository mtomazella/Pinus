const { validateToken } = require( './authentication' );
const { fetchQuery } = require( './database' );

function pass ( request, next ) { 
    delete request.query.token;
    delete request.body.token;
    next();
}

module.exports = ( request, response, next ) => {
    try {
        if ( request.path === '/login' || request.path === '/' || request.path === '/ping' ) {
            pass( request, next );
            return;
        }
        if ( request.method === 'POST' && request.path === '/user' ) { 
            pass( request, next );
            return;
        }
        if ( request.method === 'GET' && [ '/comp', '/comp/prov', '/volunt' ].includes(request.path) ) {
            pass( request, next );
            return;
        }
        if ( !request.body.token && !request.query.token ) {
            response.status(500).json( { error: { code: "MISSING_TOKEN" } } );
            return;
        }
        validateToken( request.body.token || request.query.token )
        .then( ( decoded ) => {
            delete request.query.token;
            delete request.body.token;
            if ( decoded.type === 'user' ) {
                if ( request.method === 'GET' ) { 
                    if ( [ '/admin', '/comp', '/comp/prov' ].includes( request.path ) ) { 
                        next();
                        return;
                    }
                    else if ( request.path === '/msg' && request.query.userId === decoded.id ) { 
                        next();
                        return;
                    } else response.status(500).json( { error: { code: "AUTH_ERR" } } );
                }
                else if ( request.method === 'POST' ) { 
                    if ( request.path === '/msg' && request.body.userId === decoded.id ) { 
                        next();
                        return;
                    }
                    else if ( request.path === '/volunt' && request.body.id === decoded.id ) { 
                        next();
                        return;
                    } else response.status(500).json( { error: { code: "AUTH_ERR" } } );
                }
                else if ( request.method === 'PUT' ) {
                    if ( ['/volunt', '/user'].includes(request.path) && request.body.identifier.id == decoded.id ) {
                        next();
                        return;
                    } else response.status(500).json( { error: { code: "AUTH_ERR" } } );
                }
                else if ( request.method === 'DELETE' ) {
                    if ( request.path === '/volunt' && request.body.identifier.id === decoded.id ) {
                        next();
                        return;
                    } else response.status(500).json( { error: { code: "AUTH_ERR" } } );
                }
                else {
                    response.status(500).json( { error: { code: "AUTH_ERR", desc: "Method not supported" } } );
                    return;
                }
            }
            else fetchQuery( `SELECT * FROM admin WHERE id = ${decoded.id}` )
            .then( ( admin ) => {
                if ( admin[0] ) next( );
            } )
            .catch( ( error ) => {
                console.log( error );
                response.status(500).json( { error: { code: "AUTH_ERR" } } );
                return;
            } )
        } )
        .catch( ( error ) => {
            console.log( error );
            response.status(500).json( { error: { code: "AUTH_ERR" } } );
            return;
        } )
    }
    catch ( error ) {
        console.log( error )
        response.status(500).json( { error: { code: "AUTH_ERR" } } );
        return;
    }
}
