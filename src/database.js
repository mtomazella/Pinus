const process       = require( 'process' )
const { encrypt }   = require( './authentication' );

class MysqlDatabase {
    mysql = require( 'mysql' );
    credentials; 
    fields;

    constructor ( credentials, fields ) {
        this.credentials = credentials;
        this.fields      = fields;
        return this;
    }

    connectToDatabase ( queryFunction, requiredInfo ) {
        return new Promise( ( resolve, reject ) => {
            const connection = this.mysql.createConnection( this.credentials );
            connection.connect( ( error ) => {
                if ( error ) reject( { code: 'CONNECTION_ERROR', raw: error } );
                const connectionProcess = {
                    connection,
                    resolve,
                    reject
                }
                queryFunction( connectionProcess, requiredInfo )
            } )
        } )
    }

    authenticateCredentials ( table, identifier, password ){
        const authenticationFunction = ( connectionProcess, requiredInfo ) => {
            if ( requiredInfo.password == undefined ) connectionProcess.reject( { errorCode: 'PASSWORD_UNDF', raw: { desc: 'Undefined password' } } );
            const invalidEmail = requiredInfo.identifier.email == undefined;
            const invalidId    = requiredInfo.identifier.id == undefined;
            const invalidName  = requiredInfo.identifier.displayName == undefined;
            if ( invalidEmail && invalidId && invalidName ) reject( { errorCode: 'NO_UNQ_IDENT', raw: { desc: 'No unique identifier' } } );
            let query = `SELECT id FROM ${table} WHERE password = "${encrypt(requiredInfo.password)}"`;
            const keys = Object.keys( requiredInfo.identifier );
            const values = Object.values( requiredInfo.identifier );
            for ( let i in keys ) query += ` AND ${keys[i]} = "${values[i]}"`;
            this.fetch( query, false )
            .then( ( result ) => {
                connectionProcess.resolve( result );
            } )
            .catch( ( error ) => {
                console.log(error)
                connectionProcess.reject( error );
            } );
        }
        return this.connectToDatabase( authenticationFunction, { table, identifier, password } );
    }

    fetch ( query, sendPassword ) {
        const fetchFunction = ( connectionProcess, requiredInfo ) => {
            connectionProcess.connection.query( requiredInfo.query, ( error, Qres ) => {
                if ( error ) connectionProcess.reject( { code: 'QUERY_ERROR', raw: error } );
                if ( !requiredInfo.sendPassword && Qres != undefined ) Qres.forEach( user => {
                    user.password = undefined;
                });
                connectionProcess.resolve( Qres );
            } ).end( );
        }
        return this.connectToDatabase( fetchFunction, { query, sendPassword } );
    }

    insert ( table, values, fields ) {
        const insertFunction = ( connectionProcess, requiredInfo ) => {
            let query = ` INSERT INTO ${table} VALUES ( ?`;
            const valuesArray = [ ];
            for ( let i = 0; i <= requiredInfo.fields.length-1; i++ ){
                if ( i != 0 ) query += ', ?';
                let value = requiredInfo.values[ requiredInfo.fields[ i ] ];
                if ( requiredInfo.fields[ i ] == "password" ) value = encrypt( value );
                valuesArray.push( value );
            }
            query += ');'
            connectionProcess.connection.query( query, valuesArray, ( error, Qres ) => {
                if ( error || Qres == undefined ) connectionProcess.reject( { code: 'QUERY_ERROR', raw: error } );
                else{ 
                    connectionProcess.resolve( fetchQuery( `SELECT * FROM ${table} WHERE id = ${Qres.insertId}`, false ) );
                }
            } ).end( );
        }
        return this.connectToDatabase( insertFunction, { table, values, fields } );
    }

    update ( table, info, identifier, password ) {
        const updateFunction = ( connectionProcess, requiredInfo ) => {
            if ( requiredInfo.info == undefined ) connectionProcess.reject( { code: 'UPT_UNDF', raw: { desc: 'No content in information object' } } );
            if ( requiredInfo.identifier == undefined ) connectionProcess.reject( { code: 'IDNT_UNDF', raw: { desc: 'No content in identification object' } } );
            this.authenticateCredentials( requiredInfo.table, requiredInfo.identifier, requiredInfo.password )
            .then( ( id ) => {
                if ( id[0] == undefined ) connectionProcess.reject( { code: 'ADM_USER_UNDF', raw: { desc: "No User/Admin found." } } )
                const keys = Object.keys( requiredInfo.info );
                const values = Object.values( requiredInfo.info );
                let query = `UPDATE ${table} SET ${keys[0]} = "${values[0]}"`
                for ( let i in keys ){
                    if ( i == 0 ) continue;
                    query += ` , ${keys[i]} = "${values[i]}"`
                }
                query += ` WHERE id = "${id[0].id}";`
                connectionProcess.connection.query( query, ( error ) => {
                    console.log(error)
                    if ( error ) connectionProcess.reject( { code: 'QUERY_ERROR', raw: error } );
                    else connectionProcess.resolve( this.fetch( `SELECT * FROM ${table} WHERE ${Object.keys(identifier)[0]} = "${Object.values(identifier)[0]}"`, false ) );
                } ).end( );
            } )
            .catch( ( error ) => { 
                console.log(error)
                connectionProcess.reject( { code: 'AUTH_ERROR', raw: error } ) 
            } );
        }
        return this.connectToDatabase( updateFunction, { table, info, identifier, password } )
    }
}

module.exports = {
    database: new MysqlDatabase( {
        port:       process.env.SQL_PORT,
        database:   process.env.SQL_DB,
        host:       process.env.SQL_HOST,
        user:       process.env.SQL_USER,
        password:   process.env.SQL_PASS
    }, require( './databaseFields.json' ) )
}