describe( 'dtask\'s api 测试:', function() {

    var testresolve;
    var p = dtask.promise( function( resolve, notify ) {
        testresolve = resolve;
    });

    beforeEach( function( done ) {

        setTimeout( function() {

            testresolve( 'feed' );
            done();
        }, 1);
    });

    it('dtask.defer(): 创建一个任务', function() {

        var defered = dtask.defer();

        expect( defered.hasOwnProperty( 'promise') && defered.hasOwnProperty( 'resolve' ) ).toEqual( true );
    });

    it('dtask.promise(): 生成一个promise', function( done ) {

        p.then( function( value ) {

            expect( value === 'feed' ).toEqual( true );
            done();
        });
    });

    describe( '任务测试:', function() {

        var dNotify  = dtask.defer();
        var dResolve = dtask.defer();

        beforeEach( function( done ) {

            setTimeout( function() {

                dNotify.notify( 'feed' );
                dResolve.resolve( 'feed' );
                done();
            }, 1);
        });

        it('defered.promise.then(): 指定一个任务完成时的回调', function() {

            var defered = dtask.defer();

            defered.promise.then( function( value ) {} );

            expect( defered.promise._handlers.length === 1 ).toEqual( true );
        });

        it('defered.promise.during(): 指定一个任务进行的回调', function() {

            var defered = dtask.defer();

            defered.promise.during( function( value ) {} );

            expect( defered.promise._handlers.length === 1 ).toEqual( true );
        });

        it('defered.resolve(): 解决一个任务', function( done ) {

            dResolve.promise.then( function( value ) {

                expect( value === 'feed' ).toEqual( true );
                done();
            });
        });

        it('defered.notify(): 通知一个任务的进度', function( done ) {

            dNotify.promise.during( function( value ) {

                expect( value === 'feed' ).toEqual( true );
                done();
            });
        });
    });

    describe( '立即解决一个任务:', function() {

        var dResolve = dtask.resolve( 'feed' );

        beforeEach( function( done ) {

            setTimeout( function() {

                done();
            }, 1);
        });

        it('dtask.resolve(): 用给定值返回一个已解决的任务', function( done ) {

            dResolve.then( function( value ) {

                expect( value === 'feed' ).toEqual( true );
                done();
            });
        });
    });

    describe( '任务映射:', function() {

        var defer1 = dtask.defer();
        var defer2 = dtask.defer();
        var p3 = dtask.join( defer1.promise, defer2.promise );
        var p4 = dtask.join();

        var value1 = 'feed1';
        var value2 = 'feed2';

        beforeEach( function( done ) {

            setTimeout( function() {

                defer1.resolve( value1 );
                defer2.resolve( value2 );
                done();
            }, 1);
        });

        it('dtask.join(): 将多个promise映射为单个promise (case_1)', function( done ) {

            p3.then( function( values ) {

                expect( values.length === 2 ).toEqual( true );
                expect( values[0] === value1 ).toEqual( true );
                expect( values[1] === value2 ).toEqual( true );
                done();
            });
        });

        it('dtask.join(): 将多个promise映射为单个promise (case_2)', function( done ) {

            p4.then( function( values ) {

                expect( values instanceof Array ).toEqual( true );
                expect( values.length === 0 ).toEqual( true );
                done();
            });
        });
    });

    describe( '任务化减', function() {

        var defer1 = dtask.defer();
        var defer2 = dtask.defer();
        var defer3 = dtask.defer();

        var p4 = dtask.reduce( [defer1.promise, defer2.promise, defer3.promise], function( prev, current ) {

            return prev + current;
        });

        beforeEach( function( done ) {

            setTimeout( function() {

                defer1.resolve( 1 );
                defer2.resolve( 2 );
                defer3.resolve( 3 );
                done();
            }, 1);
        });

        it('dtask.reduce(): 将多个promise化简为一个promise', function( done ) {

            p4.then( function( value ) {

                expect( value === 6 ).toEqual( true );
                done();
            });
        });
    });


    describe( '任务竞争', function() {

        var defer1 = dtask.defer();
        var defer2 = dtask.defer();
        var defer3 = dtask.defer();
        var defer4 = dtask.defer();

        var p3 = dtask.any( [defer1.promise, defer2.promise, defer3.promise, defer4.promise], 1 );

        var value1 = 'feed1';
        var value2 = 'feed2';


        beforeEach( function( done ) {

            setTimeout( function() {

                defer1.resolve( value1 );
                defer2.resolve( value2 );
                done();
            }, 1);
        });

        it('dtask.any(): 取多个promise中的任意数量个映射为单个promise', function( done ) {

            p3.then( function( values ) {

                expect( values[0].value === value1 ).toEqual( true );
                expect( values[0].index === 0 ).toEqual( true );
                done();
            });
        });
    });

    describe( '异步回调', function() {

        beforeEach( function( done ) {

            setTimeout( function() {
                done();
            }, 1);
        });

        it('console.log(1); defered.promise.then( function(){console.log(3);} ); defered.resolve(); console.log(2); 应该输出1,2,3 ', function( done ) {

            var d = dtask.defer();
            var bar = [];

            bar.push(1);
            d.promise.then(function() {bar.push(3)});
            d.resolve();
            bar.push(2);

            setTimeout( function() {
                expect( bar.join( ',' ) === '1,2,3' ).toEqual( true );
                done();
            }, 0);
        });

        it('console.log(1); defered.resolve(); defered.promise.then( function(){console.log(3);} ); console.log(2); 应该输出1,2,3 ', function( done ) {

            var d = dtask.defer();
            var bar = [];

            bar.push(1);
            d.resolve();
            d.promise.then(function() {bar.push(3)});
            bar.push(2);

            setTimeout( function() {
                expect( bar.join( ',' ) === '1,2,3' ).toEqual( true );
                done();
            }, 0);
        });
    });
});