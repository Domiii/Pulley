/**
 * This file contains some general utilities for games with AI.
 */
"use strict";

define(["Squishy"], function() {
    var GameAI = {
        /**
         * An action has a name, an id and an optional set of parameter constraints.
         */
        Action: squishy.createClass(
            // ctor
            function(name, parameterConstraints) {
            },
            
            // methods
            {
                
            }
        ),
    
        /**
         * An action table contains a set of actions.
         */
        ActionTable: squishy.createClass(
            // ctor
            function(actions) {
                
            },
            
            // methods
            {
                
            }
        ),
    };  

    return GameAI;    
});