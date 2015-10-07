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
                    watch: true
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
