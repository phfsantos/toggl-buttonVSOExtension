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
                command: 'tfx extension publish --service-url https://pheradev.visualstudio.com/ --token  --manifest-globs vss-extension.json --share-with pheradev'
            },
            vsetShare: {
                command: 'set TFX_TRACE=1&& tfx extension share --service-url https://pheradev.visualstudio.com/ --token  --vsix ordepim.PSTogglPomoExtension-1.3.vsix --share-with pheradev'
            },            
            vsetCreate: {
                command: 'tfx extension create --service-url https://pheradev.visualstudio.com/ --token  --manifest-globs vss-extension.json'
            } 
        }
    });
    grunt.registerTask('buildAndPublish', ['typescript:base', 'shell:vsetCreate', "shell:vsetShare"]);
    grunt.registerTask('build', ['typescript:base']);
    grunt.registerTask('publish', ['shell:vsetPublish']);
};
