/**
 * This file loads and starts the game and its UI.
 * Uses (partial) Google Closure annotations: https://developers.google.com/closure/compiler/docs/js-for-compiler.
 * Performance considerations (performance is always an issue in any real-time game):
 *  - Memory:
 *    -> Quick overview: http://stackoverflow.com/questions/8410667/object-pools-in-high-performance-javascript/23180342#23180342
 *    -> Memory pools: http://www.html5rocks.com/en/tutorials/speed/static-mem-pools/
 *    -> Some more info on the JS GC: http://stackoverflow.com/questions/18364175/best-practices-for-reducing-garbage-collector-activity-in-javascript
 *
 */
'use strict';


(function() {
    // #######################################################################################################################
    // Shapes & Surfaces

    /**
     * Defines all currently implemented shapes.
     * @const
     */
    var ShapeType = squishy.makeEnum([
        'AABB',
        'Disk',
        'Line'
    ]);

    /**
     * Defines all currently implemented surfaces.
     * @const
     */
    var SurfaceType = squishy.makeEnum([
        'LineSegment'
    ]);

    /**
     * Simple AABB storage class.
     * @constructor
     */
     var AABB = squishy.createClass(function(min, max) {
        // ctor
        this.min = min;
        this.max = max;
        this.dimensions = vec2.subtract(vec2.create(), max, min);
    },{
        // methods
        getArea: function () {
            return this.dimensions[Axis.X] * this.dimensions[Axis.Y];
        },
    });

    /**
     * A simple oriented 2D surface.
     * Implemented by LineSegment (and possibly some simple non-linear surface types, such as parabola).
     * @constructor
     * @interface
     */
    var Surface = squishy.createClass(
        function() {
        },{
            // methods
            
            getSurfaceType: squishy.abstractMethod()
        }
    );

    /**
     * Axis-aligned line segment.
     *
     * @constructor
     * @implements {Surface}
     * @param {Vec2} from First endpoint of the line segment.
     * @param {Vec2} to Second endpoint of the line segment.
     * @param {Vec2} normal Surface normal, pointing outwards.
     */
    var LineSegment = squishy.extendClass(Surface, function (from, to, normal, dontNormalizeNormal) {
        // ctor
        this._super();
        
        if (!dontNormalizeNormal) {
            vec2.normalize(normal, normal);
        }
        
        this.from = from;
        this.to = to;
        this.normal = normal;
        this.delta = vec2.subtract(vec2.create(), this.to, this.from);        // the vector pointing from 'from' to 'to'
    }, {
        // methods
        getSurfaceType: function() { return SurfaceType.LineSegment; },
    });

    // TODO: General line segments
    // TODO: Curved surfaces

    /**
     * Defines all methods to be implemented by any shape class.
     *
     * @interface
     */
    var Shape = squishy.createClass(
        function(def) {
        },{
            // methods
            getShapeType: squishy.abstractMethod(),
            getArea: squishy.abstractMethod(),
            containsPoint: squishy.abstractMethod(),
            getBoundingBox: squishy.abstractMethod(/* box */),

            //getSurfaces: squishy.abstractMethod(),
        }
    );

    var Shapes = {
        /**
         * @constructor
         * @implements {Shape}
         */
        AABB: squishy.extendClass(Shape, function (def) {
            // ctor
            this._super(def);
        
            this.min = def.min;
            this.max = def.max;
            this.dimensions = vec2.subtract(vec2.create(), this.max, this.min);
            
            // build line segments to outline the box
            var a = this.min;
            var b = vec2.clone(this.min);
            b[Axis.X] = this.max[Axis.X];
            var c = this.max;
            var d = vec2.clone(this.min);
            d[Axis.Y] = this.max[Axis.Y];
            
            this.vertices = [a, b, c, d];
            this.center = vec2.create();
            vec2.scale(this.center, vec2.add(this.center, this.min, this.max), .5);      // center = (min + max)/2
            
            this.surfaces = [];
            this.surfaces.push(new LineSegment(d, a, vec2.subtract(vec2.create(), d, c)));  // minX
            this.surfaces.push(new LineSegment(a, b, vec2.subtract(vec2.create(), a, d)));  // minY
            this.surfaces.push(new LineSegment(b, c, vec2.subtract(vec2.create(), b, a)));  // maxX
            this.surfaces.push(new LineSegment(c, d, vec2.subtract(vec2.create(), c, b)));  // maxY
        },{
            // methods

            /**
             * Return the type of this shape.
             */
            getShapeType: function () {
                return ShapeType.AABB;
            },
            
            getSurfaces: function() {
                return this.surfaces;
            },

            getArea: function () {
                return this.dimensions[Axis.X] * this.dimensions[Axis.Y];
            },

            /**
             * Width and height of this box.
             */
            getDimensions: function () {
                return this.dimensions;
            },
            
            /**
             * Test whether this object contains the given point in the given coordinate system.
             */
            containsPoint: function(point) {
                var x = point[Axis.X];
                var y = point[Axis.Y];
                
                return x >= this.min[Axis.X] && x <= this.max[Axis.X] && y >= this.min[Axis.Y]  && y <= this.max[Axis.Y];
            },
                
            /**
             * Every surface of an AABB can be described by knowing on which axis (x or y)
             * and knowing whether it is the min or max of the two.
             */
            getSide: function(xAxis, minSide) {
                var index = xAxis + (minSide * 2);
                return this.surfaces[index];
            },

            getBoundingBox: function(aabb) {
                vec2.copy(aabb.min, this.min);
                vec2.copy(aabb.max, this.max);
            }
        }),

        /**
         * @constructor
         * @implements {Shape}
         */
        Disk: squishy.extendClass(Shape, function (def) {
            // ctor
            this._super(def);
        
            this.center = def.center;
            this.radius = def.radius;
        },{
            // methods

            /**
             * Return the type of this shape.
             */
            getShapeType: function () {
                return ShapeType.Disk;
            },

            /**
             * Area of a disk
             */
            getArea: function () {
                return Math.PI * this.radius * this.radius;
            },

            /**
             * 
             */
            containsPoint: function(point) {
                // point must be contained by disk, i.e. distance must be <= radius
                var distSq = vec2.squaredDistance(this.center, point);
                return distSq <= this.radius * this.radius;
            },

            getBoundingBox: function(aabb) {
                aabb.min[0] = this.center[0] - radius;
                aabb.min[1] = this.center[1] - radius;
                aabb.max[0] = this.center[0] + radius;
                aabb.max[1] = this.center[1] + radius;
            }
        }),


        /**
         * @constructor
         * @implements {Shape}
         */
        Line: squishy.extendClass(Shape, function (def) {
            // ctor
            this._super(def);

            console.assert(vec2.isValid(def.v1));
            console.assert(vec2.isValid(def.v2));
            console.assert(def.width > 0);
        
            this.v1 = def.v1;
            this.v2 = def.v2;
            this.width = def.width || 0.1;
            this._diff = vec2.create();     // pre-allocate this guy
        },{
            // methods

            /**
             * Return the type of this shape.
             */
            getShapeType: function () {
                return ShapeType.Line;
            },

            /**
             * Area of a thick line is length x width
             */
            getArea: function () {
                vec2.subtract(this._diff, this.v2, this.v1);
                var len = vec2.length(this._diff);
                return len * this.width;
            },

            /**
             * @see http://stackoverflow.com/a/1501725/2228771
             */
            containsPoint: function(point) {
                // determine if point is contained by OBB that is represented by this "thick line"
                function sqr(x) { return x * x }
                function distToSegmentSquared(p, v, w) {
                    var l2 = vec2.squaredDistance(v, w);
                    if (l2 == 0) return vec2.squaredDistance(p, v);

                    var t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
                    if (t < 0) return vec2.squaredDistance(p, v);       // in front of line segment
                    if (t > 1) return vec2.squaredDistance(p, w);       // behind line segment
                    return vec2.squaredDistance(p, {                    // orthogonal to line segment
                        x: v[0] + t * (w[0] - v[0]),
                        y: v[1] + t * (w[1] - v[1])
                    });
                }
                var distSq = distToSegmentSquared(point, this.v1, this.v2);
                var dist = Math.sqrt(distSq);

                // TODO: Consider adding some epsilon to check to make sure, very thin lines can also be selected
                return dist <= this.width;      // must be inside width
            },

            getBoundingBox: function(aabb) {
                aabb.min[0] = Math.min(this.v1[0], this.v2[0]) - this.width/2;
                aabb.min[1] = Math.min(this.v1[1], this.v2[1]) - this.width/2;
                aabb.max[0] = Math.max(this.v1[0], this.v2[0]) + this.width/2;
                aabb.max[1] = Math.max(this.v1[1], this.v2[1]) + this.width/2;
            }
        })
    };


    // #######################################################################################################################
    // Objects

    /**
     * Defines all currently implemented types of objects.
     * @const
     */
    var ObjectType = squishy.makeFlagEnum([
        'RigidBody',
        'Movable'
    ]);

    var WorldObject = squishy.createClass(function() {
        // ctor
    }, {
        // methods
        getShape: squishy.abstractMethod(),
        getObjectType: squishy.abstractMethod(),

        isObjectType: function(objectType) { return this.getObjectType() & objectType; },

        toString: function() { return (!!this.name && (this.name + ' ') || '') + this.objectId; },
    });

    var Objects = {};

    // ###############################################
    // RigidBody object

    /**
     * Creates a new static RigidBody.
     * @constructor
     */
    Objects.RigidBody = squishy.extendClass(WorldObject, function (objectDefinition) {
        // ctor
        this._super();

        // copy all parameters into object
        squishy.clone(objectDefinition, false, this);

        // objects must have a position, shape and stepHeight
        squishy.assert(vec2.isValid(this.position), 'position is invalid.');
        squishy.assert(this.shape, 'shape was not defined.');

        // renderConfig can be used to override default rendering options
        this.renderConfig = this.renderConfig || {};
    }, {
        // methods
        getObjectType: function() { return ObjectType.RigidBody; },
        
        isObjectType: function(objectType) { return this.getObjectType() & objectType; },
        
        getShape: function () { return this.shape; },

        /**
         * 
         */
        canMove: function () { return false; },
        
        /**
         * Test whether this object contains the given point in world coordinates.
         */
        containsPoint: function(worldPoint) {
            // TODO: General affine transformations
            // Transform to object-local coordinate system.
            // Currently, only translations are supported, so the object-local coordinate system can only vary in origin.
            var localPoint = vec2.subtract(worldPoint, worldPoint, this.position);      // translate
            return this.shape.containsPoint(localPoint);
        }
    });


    // #######################################################################################################################
    // Movable class

    /**
     * In-world objects that may be moved, and thus have velocity and acceleration.
     *
     * @constructor
     */
    Objects.Movable = squishy.extendClass(Objects.RigidBody,
        function (objectDefinition) {
            this._super(objectDefinition);

            // movables have velocity and acceleration
            if (!vec2.isValid(this.velocity)) {
                this.velocity = vec2.create();
            }
            if (!vec2.isValid(this.acceleration)) {
                this.acceleration = vec2.create();
            }
            
            this.lastPosition = vec2.copy(vec2.create(), this.position);
            
            this.onGround = false;
            this.lastGroundIteration = 0;
            this.lastPositionDelta = vec2.create();
        }, {
            // methods

            getObjectType: function() { return ObjectType.RigidBody | ObjectType.Movable; },
            
            /**
             * 
             */
            canMove: function () {
                return true;
            },

            /**
             * Whether this object is currently not touching ground.
             */
            isFalling: function () {
                return !this.onGround;
            },

            /**
             * Movable just hit the ground.
             */
            onHitGround: function () {
                this.onGround = true;
            },
            
            /**
             * Movable just took off from the ground
             */
            onLeftGround: function() {
                this.onGround = false;
            },
        }
    );

    // #######################################################################################################################
    // World class & accessories

    /**
     * Stores collision pairs and avoids duplicate reporting.
     * Also provides a pool for CollisionPair objects to reduce GC intervention.
     * @constructor
     * @see http://bullet.googlecode.com/files/GDC10_Coumans_Erwin_Contact.pdf
     */
    var CollisionList = squishy.createClass(
        function() {
            this.pairs = {};
            this.pairPool = [];             // collision pair pool
            this.currentIteration = -1;     // current iteration helps us determine whether a pair is obsolete
        },{
            setCurrentIteration: function(it) { this.currentIteration = it; },
            
            /**
             * Establishes an order on RigidBody objects.
             * We want more frequently colliding objects listed first.
             * For now, we use a simple heuristic:
             * Movable objects generally collide more often (almost all the time), so they come first.
             *
             * @return {Bool} Returns true if obj1 comes first.
             */
            compareObjects: function(obj1, obj2) {
                var isObj1Movable = obj1.isObjectType(ObjectType.Movable);
                var isObj2Movable = obj2.isObjectType(ObjectType.Movable);
                if (isObj1Movable == isObj2Movable) {
                    // same type -> sort by ID
                    return obj1.objectId - obj2.objectId > 0;
                }
                // movable objects are 'greater than' non-movable ones.
                return isObj1Movable ? true : false;
            },
            
            addPair: function(obj1, obj2) {
                // in order to identify this pair, we need to establish an order between the two objects
                if (!this.compareObjects(obj1, obj2)) {
                    // swap the order of the two
                    var tmp = obj2;
                    obj2 = obj1;
                    obj1 = obj2;
                }
                
                // get or create CollisionPair
                var pair = this.getOrCreatePair(obj1, obj2);
                
                return pair;
            },
            
            getOrCreatePair: function(obj1, obj2) {
                // get or create collision list
                var obj1CollisionList = this.pairs[obj1.objectId];
                if (!obj1CollisionList) {
                    obj1CollisionList = this.pairs[obj1.objectId] = {};
                }
                
                var pair = obj1CollisionList[obj2.objectId];
                if (!pair) {
                    // get or create uninitialized pair
                    if (this.pairPool.length > 0) {
                        var idx = this.pairPool.length-1;
                        pair = pairPool[idx];           // get last element
                        delete pairPool[idx];           // remove from pool
                    }
                    else {
                        pair = new CollisionPair();
                    }
                    
                    // place pair in list
                    obj1CollisionList[obj2.objectId] = pair;
                    
                    // store objects in pair
                    pair.setObjects(obj1, obj2);
                }
                
                pair.refresh(this.currentIteration);
                return pair;
            },
            
            callForEachPair: function(onNewCollision, onContactGone, thisArg) {
                for (var obj1Id in this.pairs) {
                    var pairList = this.pairs[obj1Id];
                    for (var obj2Id in pairList) {
                        var pair = pairList[obj2Id];
                        var d = this.currentIteration - pair.lastActiveIteration;
                        if (d == 0) {
                            // if this collision is still active, go for it
                            onNewCollision.call(thisArg, pair);
                        }
                        else if (d == 1) {
                            // this collision was active last round, but not active anymore, so contact was broken
                            onContactGone.call(thisArg, pair);
                        }
                    }
                }
            },
            
            clearPool: function() {
                
            }
        }
    );

    /**
     * Creates a new Pulley world.
     *
     * @constructor
     */
    var PulleyWorld = squishy.createClass(
        function (config) {
            config.dt = config.dt || .06;            // set default dt
            
            // check parameter validity
            squishy.assert(config, 'config is undefined');
            squishy.assert(config.dt > 0, 'config.dt is invalid'); // must be positive
            squishy.assert(config.stepIntegrate instanceof Function, 'config.stepIntegrate is not a function');

            this.lastObjectId = 0; // running id for new objects
            this.currentIteration = 1;
            this.totalTime = 0;

            // assign properties
            this.config = config;
            this.stepIntegrate = config.stepIntegrate;

            // keep track of all objects (including movables), all movables, all current collisions
            this.objects = {};
            this.movables = {};
            this.collisions = new CollisionList();

            // create all world events
            this.events = {
                /**
                 * Game just started. // args = configuration + all initially visible objects.
                 */
                start: squishy.createEvent(this),
                
                /**
                 * Game is about to stop. // args = configuration + all initially visible objects.
                 */
                stopping: squishy.createEvent(this),

                /**
                 * Object moved. args = updated object state
                 */
                objectMoved: squishy.createEvent(this),

                /**
                 * A new object has become visible (or was added into the world).
                 */
                objectAdded: squishy.createEvent(this),

                /**
                 * Object is no longer visible. args = object id
                 */
                objectGone: squishy.createEvent(this),
            };

            // TODO: Bad bad bad!
            this._tmp = vec2.create();
        }, {
            // methods

            // ####################################################################################
            // Object management
            
            /**
             * Adds the given object to the world.
             */
            addObject: function (obj) {
                // assign id to object, if it does not exist yet
                obj.objectId = obj.objectId || ++this.lastObjectId;

                // make sure, objects cannot be added twice
                squishy.assert(!this.objects[obj.objectId], 'Object was added twice: ' + obj);

                // add object
                this.objects[obj.objectId] = obj;
                if (obj.isObjectType(ObjectType.Movable)) {
                    this.movables[obj.objectId] = obj;
                }
                
                console.log('Added object #' + obj.objectId + ' of type: ' + obj.getObjectType() + ' at ' + obj.position);

                // fire event
                this.events.objectAdded.fire(obj);
            },

            /**
             * Removes the given object from the world
             */
            removeObject: function (obj) {
                // fire event
                this.events.objectGone.fire(obj);

                // delete
                delete this.objects[obj.objectId];
                if (obj.isObjectType(ObjectType.Movable)) {
                    delete this.movables[obj.objectId];
                }
            },
            
            
            // ####################################################################################
            // Object queries
            
            /**
             * Call the given function for every object that intersects with the given point.
             */
            foreachObjectAtPoint: function(_point, callback) {
                // TODO: These kinds of single temporaries (point) are evil bottlenecks.
                // It makes parallelization practically impossible for the run-time optimizer.
                var point = vec2.create();
                for (var objectId in this.objects) {
                    if (!this.objects.hasOwnProperty(objectId)) continue;
                    var obj = this.objects[objectId];
                    vec2.copy(point, _point);         // copy point, because it will be modified
                    if (obj.containsPoint(point)) {
                        callback(obj);
                    }
                }
            },
            

            // ####################################################################################
            // World physics simulation
            
            /**
             * Start or stop running.
             */
            startStopLoop: function() {
                if (this.running) this.stopLoop();
                else this.startLoop();
            },
            
            startLoop: function() {
                if (this.running) return;
                var now = squishy.getCurrentTimeMillisHighRes();  // millis
                this.lastStepTime = now;

                //this.continueLoop();
                this.running = true;
                //this.loopTimer = setInterval(function() { this.advanceTime(); }.bind(this), this.config.dt * 1000);
            },
            
            // continueLoop: function() {
            //     // TODO: Compute correct dt
            // },
            
            stopLoop: function() {
                if (!this.running) return;
                this.running = false;
                // clearTimeout(this.loopTimer);
                // this.loopTimer = null;
            },
            
            isRunning: function() { return this.running; },

            stepOnce: function() {
                this._step();
            },

            /**
             * Get time since last step, in seconds.
             */
            getDtSinceLastStep: function () {
                if (!this.isRunning()) return 0;
                var now = squishy.getCurrentTimeMillisHighRes();  // millis
                return (now - this.lastStepTime) / 1000;
            },
            
            /**
             * Only call this from a timer.
             * Returns the ratio of remaining time left to frame-time.
             */
            advanceTime: function() {
                var dt = this.getDtSinceLastStep();
                while (dt > this.config.dt) {
                    dt -= this.config.dt;
                    this._step();
                }
                return dt/this.config.dt;
            },

            /**
             * Take a simulation step of the given length or pre-configured length.
             */            
            _step: function (dt) {
                // update iteration count & compute actual time passed
                ++this.currentIteration;
                var dt = dt || this.config.dt;
                this.totalTime += dt;
                this.lastStepTime += dt * 1000;  // millis
                
                // update velocity and position
                this.stepIntegrate(dt);
            },
        }
    );

    // #######################################################################################################################
    // Canvas Utilities


    /**
     * In theory, SVGMatrix will be used by the Canvas API in the future;
     * In practice, we can borrow an SVG matrix today!
     * @see https://developer.mozilla.org/en/docs/Web/API/SVGMatrix
     * @return {SVGMatrix}
     */
    var createMatrix = function () {
        var svgNamespace = 'http://www.w3.org/2000/svg';
        return document.createElementNS(svgNamespace, 'svg').getCTM();
    };

    /**
     * Multiples the given SVMMatrix with the given 2-component array, representing a vector and stores the result in vec.
     * @see http://stackoverflow.com/questions/7395813/html5-canvas-get-transform-matrix
     */
    var MVMulSVG = function(matrix, vec) {
        var x = vec[0], y = vec[1];
        vec[0] = x * matrix.a + y * matrix.c + matrix.e;
        vec[1] = x * matrix.b + y * matrix.d + matrix.f;
    };

    //`enhanceCanvas` takes a 2d canvas and wraps its matrix-changing
    //functions so that `context._matrix` should always correspond to its
    //current transformation matrix.
    //Call `enhanceCanvas` on a freshly-fetched 2d canvas for best results.
    var enhanceCanvas = function (canvas) {
        var context = canvas.getContext('2d');
        var m = createMatrix();
        squishy.assert(!context._matrix, 'trying to re-enhance canvas');
        context._matrix = m;

        //the stack of saved matrices
        context._savedMatrices = [m];

        var super_ = context.__proto__;
        context.__proto__ = ({
            getMatrix: function () {
                return this._matrix;
            },
            
            getInverseMatrix: function () {
                return this._matrix.inverse();
            },

            //helper for manually forcing the canvas transformation matrix to
            //match the stored matrix.
            _setMatrix: function () {
                var m = this._matrix;
                super_.setTransform.call(this, m.a, m.b, m.c, m.d, m.e, m.f);
            },

            save: function () {
                this._savedMatrices.push(this._matrix);
                super_.save.call(this);
            },

            //if the stack of matrices we're managing doesn't have a saved matrix,
            //we won't even call the context's original `restore` method.
            restore: function () {
                if (this._savedMatrices.length == 0)
                    return;
                super_.restore.call(this);
                this._matrix = this._savedMatrices.pop();
                this._setMatrix();
            },

            scale: function (x, y) {
                this._matrix = this._matrix.scaleNonUniform(x, y);
                super_.scale.call(this, x, y);
            },

            rotate: function (theta) {
                //canvas `rotate` uses radians, SVGMatrix uses degrees.
                this._matrix = this._matrix.rotate(theta * 180 / Math.PI);
                super_.rotate.call(this, theta);
            },

            translate: function (dx, dy) {
                this._matrix = this._matrix.translate(dx, dy);
                super_.translate.call(this, dx, dy);
            },

            transform: function (a, b, c, d, e, f) {
                var rhs = createMatrix();
                //2x2 scale-skew matrix
                rhs.a = a;
                rhs.b = b;
                rhs.c = c;
                rhs.d = d;

                //translation vector
                rhs.e = e;
                rhs.f = f;
                this._matrix = this._matrix.multiply(rhs);
                super_.transform.call(this, a, b, c, d, e, f);
            },

            resetTransform: function () {
                super_.resetTransform.call(this);
                this.onResetTransform();
            },
            
            /**
             * The internally stored transform is reset when canvas width and/or height are set, or when resetTransform is called.
             */
            onResetTransform: function() {
                this._matrix = createMatrix();
            },

            __proto__: super_,
            
            
            /**
             * @see http://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag
             */
            drawArrow: function(fromVec, dirVec, headLen){
                headLen = headLen || 10;   // length of head in pixels
                var fromx = fromVec[Axis.X], fromy = fromVec[Axis.Y];
                var tox = dirVec[Axis.X] + fromx, toy = dirVec[Axis.Y] + fromy;
                var angle = Math.atan2(toy-fromy,tox-fromx);
                this.moveTo(fromx, fromy);
                this.lineTo(tox, toy);
                this.lineTo(tox-headLen*Math.cos(angle-Math.PI/6),toy-headLen*Math.sin(angle-Math.PI/6));
                this.moveTo(tox, toy);
                this.lineTo(tox-headLen*Math.cos(angle+Math.PI/6),toy-headLen*Math.sin(angle+Math.PI/6));
                this.stroke();
            },
        });

        return context;
    };

    // #######################################################################################################################
    // UI settings & PulleyWorldUI Class

    /**
     * Graphical User Interface for PulleyWorld.
     * @constructor
     */
    var PulleyWorldUI = squishy.createClass(
        function (world, config, containerEl, DebugDrawEnabled) {
            console.assert(containerEl[0], 'Missing containerEl');

            // set object properties
            this.containerEl = containerEl;
            this.DebugDrawEnabled = DebugDrawEnabled;
            this.world = world;
            this.selected = {};

            // TODO: Bad bad bad!
            this._tmp = vec2.create();

            // setup everything
            this.registerEventListeners();
            this.setupUI();

            // add render hooks
            this.onRender = config.onRender || {};
            this.onRender.pre = this.onRender.pre || function() {};
            this.onRender.post = this.onRender.post || function() {};

            // start render loop
            this.requestRendering(true);
        }, {
            // ###################################################################################################
            // UI Setup

            /**
             * @sealed
             */
            setupUI: function () {
                // create and append canvas
                var $canvas = this.$canvas = $('<canvas></canvas>');
                this.containerEl.append($canvas);

                // HTML elements need tabindex to be focusable (see: http://stackoverflow.com/questions/5965924/jquery-focus-to-div-is-not-working)
                $canvas.attr('tabindex', 0);

                var canvasDOM = $canvas[0];

                // enhance canvas context functionality
                var context = canvasDOM.getContext('2d');
                enhanceCanvas(canvasDOM);       // keep track of transformation matrix, and some other goodies...
                this.context = context;
                
                // always keep the same aspect ratio
                $(window).resize(function() {
                    this.fixAspectRatio();
                    this.requestRendering(true);       // request a re-draw, in case rendering loop is not active
                }.bind(this));

                // mouse interaction
                this.cursorClient = vec2.create();
                this.cursorWorld = vec2.create();
                
                $canvas.mousemove(function (event) {
                    // update mouse coordinates
                    // see: http://stackoverflow.com/questions/3234256/find-mouse-position-relative-to-element
                    var offset = this.$canvas.offset();
                    var x = event.pageX - offset.left;
                    var y = event.pageY - offset.top;
                    vec2.set(this.cursorClient, x, y);

                    this.onCursorMove();
                }.bind(this));
                squishy.onPress(canvasDOM, function(event) {
                    this.onTouch();
                }.bind(this));
                
                this.fixAspectRatio();
            },


            // ###################################################################################################
            // Render loop control

            /**
             * Start or stop running.
             */
            startStopLoop: function() {
                if (this.running) this.stopLoop();
                else this.startLoop();
            },
            
            startLoop: function() {
                if (this.running) return;
                this.running = true;
                this.world.startLoop();

                this.requestRendering(false);
            },
            
            // continueLoop: function() {
            //     // TODO: Compute correct dt
            // },
            
            stopLoop: function() {
                if (!this.running) return;
                this.running = false;
                this.world.stopLoop();
            },

            stepOnce: function() {
                this.world.stepOnce();
                this.requestRendering(true);
            },
            
            /**
             * Request _render to be called again soon.
             */
            requestRendering: function(force) {
                if (!force && !this.running) return;

                if (!this.renderTimer) this.renderTimer = requestAnimationFrame(this._render.bind(this));
            },
            
            // ###################################################################################################
            // Rendering

            getRenderer: function(shapeType) {
                return Renderers.byType[shapeType];
            },
            
            /**
             * @see http://blog.allanbishop.com/box-2d-2-1a-tutorial-part-10-fixed-time-step/
             */
            getRenderPosition: function(obj, pos, timeRatio) {
                if (!obj.isObjectType(ObjectType.Movable)) {
                    vec2.copy(pos, obj.position);
                }
                else {
                    // interpolate between the previous two positions
                    vec2.subtract(pos, obj.position, obj.lastPosition);
                    vec2.scaleAndAdd(pos, obj.lastPosition, pos, timeRatio);
                }
            },

            /**
             * @see http://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
             */
            clear: function() {
                var ctx = this.context;
                var canvas = this.$canvas[0];
                
                // Store the current transformation matrix
                ctx.save();
                
                // Use the identity matrix while clearing the canvas
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Restore the transform
                ctx.restore();
            },

            _render: function (timestamp) {
                // advance physics simulation
                var timeRatio = this.world.advanceTime();
                
                // re-draw all objects
                var canvasDOM = this.$canvas[0];
                var context = this.context;
                var tmp = vec2.create();        // bad!

                // clear canvas
                this.clear();

                this.onRender.pre.call(this);

                var renderPos = vec2.create();
                
                for (var objId in this.world.objects) {
                    if (!this.world.objects.hasOwnProperty(objId)) continue;
                    var obj = this.world.objects[objId];

                    // TODO: Check if object intersects with viewport
                    var shape = obj.getShape();
                    var shapeType = shape.getShapeType();
                    var objectRenderer = this.getRenderer(shapeType);
                    if (!objectRenderer) {
                        throw new Error('Shape has no renderer: ' + ShapeType.toString(shapeType));
                    }

                    this.getRenderPosition(obj, renderPos, timeRatio);        // compute a more accurate guess of current position
                    objectRenderer.draw(this, context, renderPos, obj, shape);
                    if (this.DebugDrawEnabled) {
                        // draw some additional information
                        objectRenderer.debugDraw(this, context, renderPos, obj, shape);
                    }
                }

                this.onRender.post.call(this);

                this.renderTimer = null;
                this.requestRendering(false);
            },
            
            
            // ###################################################################################################
            // Event listeners
        
            /**
             * Register world event listeners.
             * @sealed
             */
            registerEventListeners: function () {
                // none needed yet
            },
            
            /**
             * Called everytime the viewport changed.
             */
            fixAspectRatio: function() {
                console.log('fixAspectRatio');

                var canvasDOM = this.$canvas[0];
                //var context = canvasDOM.getContext('2d');
                var context = this.context;

                // This function resets the aspect ratio.
                // If this function is not called, the canvas transformation will stay the same, 
                // and the canvas contents will stretch to fit to the container, thereby ruining the aspect ratio.
                // Sadly, setting canvas width or height resets the entire context.
                // So we have to re-initialize everything.
                var screenW = canvasDOM.width = this.$canvas.innerWidth();
                var screenH = canvasDOM.height = this.$canvas.innerHeight();

                // re-compute viewport aabb
                var canvasDOM = this.$canvas[0];
                var worldCfg = this.world.config;
                var aspectRatio = screenW/screenH;
                var worldH = worldCfg.ceiling - worldCfg.floor;
                var worldW = worldH * aspectRatio;
                this.viewport = new AABB([-worldW/2, worldCfg.floor], [worldW, worldH]);
                
                // compute new world-to-viewport matrix
                context.onResetTransform();
                
                // flip the y-axis, so y points up (as in regular physics)
                context.scale(1, -1);
                context.translate(0, -canvasDOM.height);

                // transform canvas into world space
                var wScale = screenW/worldW;
                var hScale = screenH/worldH;
                context.scale(wScale, hScale);
                context.translate(worldW/2, 0);

                this.world2ClientMatrix = this.getContext().getMatrix();
                this.client2WorldMatrix = this.getContext().getInverseMatrix();
            
                this.transformClientToWorld(this.viewport.min);
                this.transformClientToWorld(this.viewport.max);
            
                // cursor moved (relative to world)
                this.onCursorMove();
            },
            
            /**
             * Mouse movement relative to world.
             * Note that moving the viewport also moves the mouse relative to the world.
             */
            onCursorMove: function() {
                vec2.copy(this.cursorWorld, this.cursorClient);
                this.transformClientToWorld(this.cursorWorld);
            },
            
            /**
             * Select objects
             */
            onTouch: function() {
                var coords = this.cursorWorld;
                this.world.foreachObjectAtPoint(coords, function(obj) {
                    this.selectObject(obj);
                }.bind(this));
            },
            
        
            // ###################################################################################################
            // Manage UI
            
            getContext: function() { return this.$canvas[0].getContext('2d'); },
            
            /**
             * Convert client (e.g. mouse or touch) coordinates to world coordinates.
             * Result will be stored in the given client coordinates vector.
             */
            transformClientToWorld: function(vec) {
                MVMulSVG(this.client2WorldMatrix, vec);
            },
            transformWorldToClient: function(vec) {
                MVMulSVG(this.world2ClientMatrix, vec);
            },
        
            // ###################################################################################################
            // Objects in UI
            
            _checkObjectOrObjectId: function(objectOrObjectId) {
                var obj;
                if (objectOrObjectId instanceof Objects.RigidBody) obj = objectOrObjectId;
                else obj = this.world.objects[objectOrObjectId];
                if (!obj) throw new Error('objectOrObjectId is invalid: ' + objectOrObjectId);
                return obj;
            },
            
            /**
             * Whether the given object is selected.
             */
            isSelected: function(objectOrObjectId) {
                var obj = this._checkObjectOrObjectId(objectOrObjectId);
                return !!this.selected[obj.objectId];
            },
            
            /**
             * Toggle, select or deselect object (to force select or deselect, use second parameter; else selection is toggled).
             * @param {} objectOrObjectId The object to be selected or deselected, or it's objectId.
             * @param {Bool} forceSelect If true, will either select object or do nothing (if already selected). If false, will either deselect object or do nothing.
             */
            selectObject: function(objectOrObjectId, forceSelect) {
                var obj = this._checkObjectOrObjectId(objectOrObjectId);
                var isSelected = this.selected[obj.objectId];
                if (!squishy.isDefined(forceSelect)) forceSelect = !isSelected;
                if (isSelected == forceSelect) {
                    return;     // nothing to do
                }
                
                if (forceSelect) {
                    // select
                    this.selected[obj.objectId] = obj;
                }
                else {
                    // de-select
                    delete this.selected[obj.objectId];
                }
                
                this.requestRendering(true);    // things changed, so we need to re-render
                
                // TODO: Raise event
            }
            
        }
    );


    // #######################################################################################################################
    // Renderers

    var RendererConfig = {
        shapeColor: '#222299',          // dark blue
        borderColor: '#000000',         // black
        borderWidth: .01,               // 

        selectedBorderColor: '#AA1111',         // red
        selectedBorderWidth: .02,               // 
    };

    var Renderers = {
        /**
         * An array of all renderers
         */
        list: [
        {
            // AABB renderer
            shape: 'AABB', 
            draw: function(ui, context, pos, obj, shape) {
                //if (obj.velocity)
                    //console.log(pos);
                vec2.add(pos, pos, shape.min);

                // draw filled rectangle with a border
                // see http://www.html5canvastutorials.com/tutorials/html5-canvas-rectangles/

                context.beginPath();
                context.fillStyle = obj.renderConfig.shapeColor || RendererConfig.shapeColor,
                context.strokeStyle = obj.renderConfig.borderColor || RendererConfig.borderColor;
                context.lineWidth = obj.renderConfig.borderWidth || RendererConfig.borderWidth;
                context.strokeRect(pos[Axis.X], pos[Axis.Y], shape.dimensions[Axis.X], shape.dimensions[Axis.Y]);
                context.fillRect(pos[Axis.X], pos[Axis.Y], shape.dimensions[Axis.X], shape.dimensions[Axis.Y]);
                
                if (ui.isSelected(obj)) {
                    // draw selection
                    //context.beginPath();
                    context.lineWidth =  obj.renderConfig.selectedBorderWidth || RendererConfig.selectedBorderWidth;
                    context.strokeStyle = obj.renderConfig.selectedBorderColor || RendererConfig.selectedBorderColor;
                    context.strokeRect(pos[Axis.X], pos[Axis.Y], shape.dimensions[Axis.X], shape.dimensions[Axis.Y]);
                }
            },
                
            /**
             * Visualize stuff for debugging purposes.
             */
            debugDraw: function(ui, context, pos, obj, shape) {
                context.lineWidth = .02;                // TODO: Compute from world size
                context.strokeStyle = RendererConfig.selectedColor;
                    
                // draw surface normals
                shape.getSurfaces().forEach(function(line) {
                    var normal = vec2.scale(vec2.create(), line.normal, 10);
                    vec2.add(pos, pos, line.from);
                    vec2.scaleAndAdd(pos, pos, line.delta, .5);
                    //context.drawArrow(pos, normal, 5);
                });
            }
            // AABB
        },{
            // Disk
            shape: 'Disk',
            /**
             * @see http://www.w3schools.com/tags/canvas_arc.asp
             */
            draw: function(ui, context, pos, obj, shape) {
                vec2.add(pos, pos, shape.center);

                context.beginPath();
                context.arc(pos[Axis.X], pos[Axis.Y], shape.radius, 0, 2 * Math.PI);

                context.fillStyle = obj.renderConfig.shapeColor || RendererConfig.shapeColor,
                context.fill();

                context.strokeStyle = obj.renderConfig.borderColor || RendererConfig.borderColor;
                context.lineWidth = obj.renderConfig.borderWidth || RendererConfig.borderWidth;
                context.stroke();
                
                if (ui.isSelected(obj)) {
                    // draw selection
                    context.lineWidth =  obj.renderConfig.selectedBorderWidth || RendererConfig.selectedBorderWidth;
                    context.strokeStyle = obj.renderConfig.selectedBorderColor || RendererConfig.selectedBorderColor;
                    context.stroke();
                }
            },

            /**
             * Visualize stuff for debugging purposes.
             */
            debugDraw: function(ui, context, pos, obj, shape) {
            }

            // Disk
        },{
            // Line
            shape: 'Line',
            draw: function(ui, context, pos, obj, shape) {
                if (ui.isSelected(obj)) {
                    // draw selection
                    context.beginPath();
                    var delta = (obj.renderConfig.selectedBorderWidth || RendererConfig.selectedBorderWidth) / 2;
                    context.lineWidth = shape.width + delta;
                    context.strokeStyle = obj.renderConfig.selectedBorderColor || RendererConfig.selectedBorderColor;
                    context.moveTo(shape.v1[Axis.X] + pos[Axis.X], shape.v1[Axis.Y] + pos[Axis.Y]);
                    context.lineTo(shape.v2[Axis.X] + pos[Axis.X], shape.v2[Axis.Y] + pos[Axis.Y]);
                    context.stroke();
                }

                context.beginPath();
                context.strokeStyle = obj.renderConfig.borderColor || RendererConfig.borderColor;
                context.lineWidth = shape.width;
                context.moveTo(shape.v1[Axis.X] + pos[Axis.X], shape.v1[Axis.Y] + pos[Axis.Y]);
                context.lineTo(shape.v2[Axis.X] + pos[Axis.X], shape.v2[Axis.Y] + pos[Axis.Y]);
                context.stroke();
            },

            /**
             * Visualize stuff for debugging purposes.
             */
            debugDraw: function(ui, context, pos, obj, shape) {
            }

            // Line
        }
        ]
    };

    Renderers.byName = _.indexBy(Renderers.list, 'shape');
    Renderers.byType = _.indexBy(Renderers.list, function(renderer) {
        // lookup shape type id
        var shapeType = ShapeType[renderer.shape];
        console.assert(shapeType, 'Invalid renderer type does not exist: ' + renderer.shape);
        return shapeType;
    });


    // #######################################################################################################################
    // World creation utilities

    // creates a static box object
    var AddBox = function (x, y, w, h, name) {
        var def = {
            position: vec2.fromValues(x, y),
            shape: new Shapes.AABB({
                min: vec2.fromValues(0, 0), 
                max: vec2.fromValues(w, h)
            }),
            name: name
        };

        var obj = new Objects.RigidBody(def);
        world.addObject(obj);
        return obj;
    };

    var AddDisk = function(x, y, r, name, renderConfig) {
        var def = {
            position: vec2.fromValues(x, y),
            shape: new Shapes.Disk({
                center: vec2.fromValues(0, 0),
                radius: r
            }),
            name: name,
            renderConfig: renderConfig
        };

        var obj = new Objects.RigidBody(def);
        world.addObject(obj);
        return obj;
    };

    var AddLine = function(x1, y1, x2, y2, width, name, renderConfig) {
        var def = {
            position: vec2.fromValues(x1, y1),
            shape: new Shapes.Line({
                v1: vec2.fromValues(0, 0),
                v2: vec2.fromValues(x2, y2),
                width: width
            }),
            name: name,
            renderConfig: renderConfig
        };

        var obj = new Objects.RigidBody(def);
        world.addObject(obj);
        return obj;
    };


    // #########################################################################################################################################
    // Pulley physics

    var CreatePulley = function(top) {
        // initialize pulley
        var diskRadius = .5;                        // 50 cm
        var pulley = {
            // ############################################################        
            // geometry and invariable physics

            // string
            freeStringLength: 3,            // does not include the part attached to the disk

            // disk
            diskRadius: diskRadius, 
            diskPosition: vec2.fromValues(0, top - .1 - diskRadius),    // horizontally centered

            // left side has a payload (pump etc.)
            payloadSize: vec2.fromValues(0.2, 0.1),
            payloadMass: 0.49, // [kg]

            // right side has a counter-weight
            counterWeightSize: vec2.fromValues(0.3, 0.2),
            counterWeightMass: 0.5,             // 500g of counter weight mass, or 500l of helium

            ballonetPumpInFlow: 0.006,          // When pump is on, air is pumped into ballonet [m^3/s] (0.006 m^3/s = 6 L/s)
            ballonetOutFlow: 0.01,              // When valve is open, ballonet loses air [m^3/s]


            // ############################################################
            // physics computation

            physics: {
                // free variables
                isValveOpen: false,
                isPumpOn: true,

                // dependent variables
                ballonetVolume: 0.01,           // ballonet's air volume has a direct impact on force
                payloadPosition: 1.5,           // vertical position (equal to length of right string; centered initially)
                payloadVelocity: 0,             // vertical velocity of left-hand side (not moving initially)
            }
        };


        // ############################################################
        // public methods

        pulley.getHeightForPayloadPosition = function(pos) {
            return pulleyTop - pulley.freeStringLength + pos;
        };

        pulley.initializePulley = function(world) {
            this.world = world;

            // create Pulley components
            this.components = {
                disk: AddDisk(pulleyCenter[0], pulleyCenter[1], this.diskRadius, 'disk'),

                leftString: AddLine(pulleyLeft, pulleyTop, 0, dependentGeometry.leftStringBottomY, .01, 'pulley leftString'),
                rightString: AddLine(pulleyRight, pulleyTop, 0, dependentGeometry.rightStringBottomY, .01, 'pulley rightString'),

                // right
                counterWeight: AddBox(pulleyRight - this.counterWeightSize[0]/2, dependentGeometry.counterWeightY, this.counterWeightSize[0], this.counterWeightSize[1], 'counter weight'),

                // left: Payload + ballonet
                leftPayload: AddBox(pulleyLeft - this.payloadSize[0]/2, dependentGeometry.leftPayloadY, this.payloadSize[0], this.payloadSize[1], 'payload'),
                // 
                ballonet: AddDisk(pulleyLeft, dependentGeometry.ballonetY, dependentGeometry.ballonetRadius, 'ballonet')
            };
        };

        /**
         * Called every step
         */
        var updatePulleyComponents = function() {
            this.components.leftString.shape.v2[1] = dependentGeometry.leftStringBottomY;
            this.components.rightString.shape.v2[1] = dependentGeometry.rightStringBottomY;
            this.components.counterWeight.position[1] = dependentGeometry.counterWeightY;
            this.components.leftPayload.position[1] = dependentGeometry.leftPayloadY;
            this.components.ballonet.position[1] = dependentGeometry.ballonetY;
            this.components.ballonet.shape.radius = dependentGeometry.ballonetRadius;
        }.bind(pulley);

        /**
         * Simulate Pulley physics (single step)
         * NOTE: this === world
         */
        pulley.stepIntegrate = function(dt) {
            if (this.physics.isPumpOn) {
                // pump action
                this.physics.ballonetVolume += this.ballonetPumpInFlow * dt;
            }
            if (this.physics.isValveOpen) {
                // TODO: Rapidly losing air is going to increase velocity due to rocket equation
                //      see: http://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation
                this.physics.ballonetVolume -= this.ballonetOutFlow * dt;
                this.physics.ballonetVolume = Math.max(0, this.physics.ballonetVolume);
            }

            // compute and sum up forces:
            var g = -9.81;                      // Earth gravitational acceleration
            var airDensity = 1.2;               // 1.2 kg/m^3
            var frictionConstant = 10;         // we have at least some minimal friction (if too big, integration grows unstable!!)

            // 1. compute total mass
            this.physics.totalPayloadMass = this.payloadMass + (this.physics.ballonetVolume * airDensity);

            // 2. compute total force contributions on payload (left-side string bottom position)
            // TODO: Drag is a function of balloon size + uncertainty
            var v = this.physics.payloadVelocity;
            var epsilon = 0;                        // errors + uncertainties
            this.physics.B = this.physics.totalPayloadMass * g;             // Buyoancy
            this.physics.W = this.counterWeightMass * g;                    // Weight
            //this.physics.D = -frictionConstant * v;                       // simplified Drag + friction
            this.physics.F = this.physics.B - this.physics.W + epsilon;     // weight pulls down

            // 3. compute acceleration
            this.physics.a = this.physics.F / Math.abs(this.physics.totalPayloadMass - this.counterWeightMass);

            // Semi-implicit Euler integration:
            // a) update velocity
            // v = v_old + (a - mu_friction * v) * dt <=> (1) v / dt = (v_old/dt + a) / (1 + mu_friction)
            this.physics.D = -frictionConstant * v;                         // simplified Drag + friction
            this.physics.payloadVelocity += (this.physics.a + this.physics.D) * dt;

            // b) update position
            this.physics.payloadPosition += this.physics.payloadVelocity * dt;


            // ########################################################
            // update geometry

            updateDependentGeometry();

            var rightStringLength = pulley.physics.payloadPosition;
            var leftStringLength = pulley.freeStringLength - pulley.physics.payloadPosition;
            var floorHeight = pulleyTop - world.config.floor;

            // resolve collisions (non-elastic; kinetic energy dissipates)
            if (rightStringLength > floorHeight) {
                // right side bumps against floor
                this.physics.payloadPosition = pulleyTop;
                this.physics.payloadVelocity = 0;
            }
            else if (leftStringLength > floorHeight) {
                // left side bumps against floor
                pulley.physics.payloadPosition = pulley.freeStringLength - floorHeight;
                this.physics.payloadVelocity = 0;
            }
            else if (rightStringLength < 0) {
                // right side bumps against pulley wheel
                this.physics.payloadPosition = 0;
                this.physics.payloadVelocity = 0;
            }
            else if (leftStringLength < 0) {
                // left side bumps against pulley wheel
                this.physics.payloadPosition = pulley.freeStringLength;
                this.physics.payloadVelocity = 0;
            }

            updatePulleyComponents();

            if (this.onStep) {
                this.onStep();
            }
        };

        // ###################################
        // controller interface

        /**
         *
         */
        pulley.getControllerValue = function() {
            return this.physics.payloadPosition;
        };

        /**
         * Called by controller to update it's "recommended value"
         */
        pulley.setControllerValue = function(u) {
            var epsilon = .0000001;
            if (u > epsilon) {
                // need to move up
                this.physics.isPumpOn = false;
                this.physics.isValveOpen = true;
            }
            else if (u < -epsilon) {
                // need to move down
                this.physics.isPumpOn = true;
                this.physics.isValveOpen = false;
            }
            else {
                // do nothing
                this.physics.isPumpOn = false;
                this.physics.isValveOpen = false;
            }
        };

        // ############################################################
        // create and maintain pulley and its components

        // static geometry
        var pulleyCenter = pulley.diskPosition;
        var pulleyLeft = pulleyCenter[0] - pulley.diskRadius;
        var pulleyRight = pulleyCenter[0] + pulley.diskRadius;
        var pulleyTop = pulleyCenter[1];

        // dependent geometry
        var dependentGeometry = {};

        var updateDependentGeometry = function() {
            dependentGeometry.pulleyBottomLeft = pulley.getHeightForPayloadPosition(pulley.physics.payloadPosition);
            dependentGeometry.pulleyBottomRight = pulleyTop - pulley.physics.payloadPosition;
            dependentGeometry.ballonetRadius = Math.pow(3/4 * pulley.physics.ballonetVolume / Math.PI, 1/3);

            dependentGeometry.leftStringBottomY = dependentGeometry.pulleyBottomLeft - pulleyTop;
            dependentGeometry.rightStringBottomY = dependentGeometry.pulleyBottomRight - pulleyTop;
            dependentGeometry.counterWeightY = dependentGeometry.pulleyBottomRight - pulley.counterWeightSize[1];
            dependentGeometry.leftPayloadY = dependentGeometry.pulleyBottomLeft - pulley.payloadSize[1];
            dependentGeometry.ballonetY = dependentGeometry.pulleyBottomLeft - dependentGeometry.ballonetRadius - pulley.payloadSize[1];
        };

        updateDependentGeometry();


        // return result
        return pulley;
    };

    var PIDControllerClass = squishy.createClass(function(cfg) {
        // ctor
        squishy.clone(cfg, false, this);                 // copy values to controller instance

        this.physics = {
            // last error value (distance to setPoint)
            errorValue: 0,

            // proportional output
            Pout: 0,

            // integral output
            Iout: 0,

            // derivative output
            Dout: 0,

            // total controller output
            u: 0
        };
    },{
        // methods

        update: function() {
            if (!this.isOn) return;

            var plant = this.plant;
            var val = plant.getControllerValue();
            
            var lastErrorValue = this.physics.errorValue;
            this.physics.errorValue = this.setPoint - val;

            // proportional
            this.physics.Pout = this.kP * this.physics.errorValue;

            // integration
            this.physics.Iout += this.kI * this.physics.errorValue;

            // derivative
            this.physics.Dout = this.kD * (this.physics.errorValue - lastErrorValue);

            // compute total
            var u = this.physics.u = this.physics.Pout + this.physics.Iout + this.physics.Dout;
            plant.setControllerValue(u);
            return u;
        }
    });

    var stepIntegrate = function(dt) {
        PIDController.update();

        pulley.stepIntegrate(dt);
    };


    // #######################################################################################################################
    // Create Pulley and controller

    var ceiling = 5;          // 5m

    var pulley = CreatePulley(ceiling);

    var PIDController = new PIDControllerClass({
        plant: pulley,
        setPoint: 2,                  // [m] (right-hand string length)
        isOn: true,

        // gains
        kP: .1,
        kI: .00000,
        kD: 3
    });


    // #######################################################################################################################
    // Setup a simple world & start UI

    // setup world configuration
    var worldCfg = {
        dt: .015,                // in seconds
        floor: 0,           
        ceiling: ceiling, 
        stepIntegrate: stepIntegrate
    };

    var world = new PulleyWorld(worldCfg);

    // add static geometry
    var floor = AddBox(-50, worldCfg.floor, 100, 0.1, 'floor');                      // long ground box
    var ceiling = AddBox(-50, worldCfg.ceiling - 0.1, 100, 0.1, 'ceiling');            // long ceiling box

    // add pulley
    pulley.initializePulley(world);

    // ####################################################################################
    // Angular controller

    var includeModules = [];
    var app = angular.module('app', includeModules);

    app.controller('worldCtrl', ['$scope', function($scope) {
        $scope.squishy = squishy;
        $scope._ = _;

        $scope.world = world;
        $scope.pulley = pulley;
        $scope.rendering = Rendering;
        $scope.PIDController = PIDController;

        $scope.startStopLoop = function() {
            Rendering.world.startStopLoop();
        };

        $scope.stepOnce = function() {
            Rendering.world.stepOnce();
        };

        $scope.togglePump = function() {
            pulley.physics.isPumpOn = !pulley.physics.isPumpOn;
        };

        $scope.toggleValve = function() {
            pulley.physics.isValveOpen = !pulley.physics.isValveOpen;
        };

        $scope.resetBallonet = function() {
            pulley.physics.ballonetVolume = 0.01;
        };

        $scope.toggleController = function() {
            PIDController.isOn = !PIDController.isOn;
        };


        // ################################################################################
        // Angular utilities

        /**
         * Call $scope.$digest(fn), if it is safe to do so
         *  (i.e. digest or apply cycle is currently not executing).
         */
        $scope.safeDigest = function(fn) {
            if (!this.$root) return;        // scope has been destroyed

            var phase = this.$root.$$phase;
            if(phase == '$apply' || phase == '$digest') {
                if(fn && (fn instanceof Function)) {
                    fn();
                }
            } else {
                this.$digest(fn);
                //this.digestAndMeasure(fn);
            }
        },

        $scope.applyLater = function(fn) {
            if (!this.$root) return;        // scope has been destroyed

            // if already running timer, don't do it again
            if (!this.$root._applyLater) {
                this.$root._applyLater = 1;
                setTimeout(function() {
                    if (!this.$root) return;        // scope has been destroyed

                    // done -> Apply!
                    this.$root._applyLater = 0;
                    this.$apply(fn);
                }.bind(this));
            }
        };

        pulley.onStep = function() {
            $scope.applyLater();
        };

        $(document).mousemove(function($evt) {
            $scope.safeDigest();
        });
    }]);


    // #######################################################################################################################
    // Extra rendering

    var onPostRender = function() {
        var context = this.context;

        // draw force

        //context.drawArrow(from, normal, 5);
    };

    // add special render options
    var renderConfig = {
        onRender: {
            post: onPostRender
        }
    };

    var Rendering = {};
    var pulleyCenter = pulley.diskPosition;
    var pulleyLeft = pulleyCenter[0] - pulley.diskRadius;

    var setPointMarkerW = 1;
    Rendering.setPointMarker = AddLine(pulleyLeft - setPointMarkerW/2, pulley.getHeightForPayloadPosition(PIDController.setPoint), setPointMarkerW, 0, 
            .01, 'set point', {
        borderColor: '#FF0000'
    });

    setTimeout(function() {
        // ####################################################################################
        // World controls

        // bind keys
        Mousetrap.bind('left', function(e) {
            
        }, 'keydown');


        // ####################################################################################
        // setup and start Renderer

        //$('body').css('top', '10px');
        var worldEl = $('#world');
        Rendering.world = new PulleyWorldUI(world, renderConfig, worldEl, true);
        Rendering.world.stepOnce();

        // start render + simulation loop
        Rendering.world.startLoop();
    });
})();
