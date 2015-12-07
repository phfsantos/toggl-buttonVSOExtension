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

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-shell');

    //require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

    grunt.initConfig({
        typescript: {
            base: {
                src: ['scripts/*.ts'],
                dest: 'public/javascripts/vsotogglbutton.js',
                options: {
                    sourceMap: true,
                    declaration: false,
                    watch: false
               }
            },
        },
        shell: {
            vsetPublish: {
                command: 'vset publish'
            } 
        }
    });
    grunt.registerTask('buildAndPublish', ['typescript:base', 'shell:vsetPublish']);
    grunt.registerTask('build', ['typescript:base']);
    grunt.registerTask('publish', ['shell:vsetPublish']);
};
