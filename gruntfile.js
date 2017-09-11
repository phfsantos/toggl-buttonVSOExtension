"use strict";
 //---------------------------------------------------------------------
 // <copyright file="gruntfile.js">
 //    This code is licensed under the MIT License.
 //    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
 //    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
 //    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
 //    PARTICULAR PURPOSE AND NONINFRINGEMENT.
 // </copyright>
 // <summary>grunt configuration file</summary>
 //---------------------------------------------------------------------
var typescript = require('rollup-plugin-typescript');
var sourcemaps = require('rollup-plugin-sourcemaps');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-rollup');
    grunt.loadNpmTasks('grunt-shell');

    //require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

    grunt.initConfig({    
        rollup: {
            options: {
                plugins: [
                    typescript({
                        target: "es5",
                        module: "es2015",
                        moduleResolution: 'node',
                    }),
                    sourcemaps()
                ],
                sourcemap: true,
            },
            files: {
                dest: 'public/javascripts/pomoTogglTimer.js',
                src: ['scripts/pomoToggleTimer.ts'],
            },
        },
        shell: {
            publish: {
                command: 'tfx extension publish --share-with pheradev'
            },
        }
    });
    grunt.registerTask('buildAndPublish', ['rollup', 'shell:publish']);
    grunt.registerTask('build', ['rollup']);
    grunt.registerTask('publish', ['shell:publish']);
};
