/*global require, console, process */
/*jshint strict:false */

var css_src = 'sass',
    css_build = 'css',
    js_src = 'js',
    js_build = 'js_build',
    // images_src = 'app/assets/images',
    // images_build = 'public/images',
    bower_src = 'bower_components';

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    libsass = require('gulp-sass'),
    sass = require('gulp-sass'),
    scsslint = require('gulp-scss-lint'),
    notify = require('gulp-notify'),
    autoprefix = require('gulp-autoprefixer'),
    phpunit = require('gulp-phpunit'),
    argv = require('yargs').argv,
    spawn = require('child_process').spawn,
    minifyCSS = require('gulp-minify-css'),
    jshint = require('gulp-jshint'),
    map = require('map-stream'),
    uglify = require('gulp-uglifyjs'),
    imagemin = require('gulp-imagemin'),
    clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    cache = require('gulp-cache'),
    livereload = require('gulp-livereload'),
    rename = require('gulp-rename'),
    bless = require('gulp-bless'),
    debug = require('gulp-debug'),
    fs = require('fs'),
    psi = require('psi');

gulp.task('sass', ['css']);
gulp.task('css', function() {
    return gulp.src(css_src + '/**/*.scss')
        .pipe(libsass({
            includePaths: ['bower_components'],
            outputStyle: 'expanded',
            sourceComments: 'normal',
            onError: function(error_string) {
                var error_file = error_string.split(': error:')[0].split(':')[0],
                    error_local_file = css_src + error_file.split(css_src)[1],
                    error_line = error_string.split(': error:')[0].split(':')[1],
                    error_message = error_string.split(': error:')[1].trim();

                gutil.log( gutil.colors.red('[Libsass error] "' + error_message + '"'),
                           gutil.colors.cyan("in " + error_local_file + ", line "+ error_line) );
                gutil.beep();
            }
        }))
        .pipe(autoprefix('last 10 version'))
        .pipe(gulp.dest(css_build))
        .pipe(minifyCSS())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(css_build))
        .pipe(notify("CSS built"));
});

gulp.task('jshint', function() {
    return gulp.src(js_src + '/**/*.js')
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(notify(function (file) {
            if (file.jshint.success) {
                return false;
            }
            gutil.beep();
            var errors = file.jshint.results.map(function (data) {
                if (data.error) {
                    return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason;
                }
            }).join("\n");
            return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors;
        }));
});

gulp.task('javascript', ['js']);
gulp.task('js', ['jshint'], function() {
    return gulp.src([bower_src + '/jquery/dist/jquery.js', js_src + '/main.js'])
        .pipe(uglify('main.js', {
            outSourceMap: true,
            basePath: '/js_build',
            compress: {
                drop_console: false,
                drop_debugger: true,
                dead_code: true
            }
        }))
        .pipe(gulp.dest(js_build))
        .pipe(notify('Javascript built'));
});

gulp.task('clean', function() {
    return gulp.src([
            css_build+'/**/*',
            js_build+'/**/*',
            images_build+'/**/*'
        ], {read: false})
        .pipe(clean());
});

gulp.task('livereload', function() {
    var server = livereload();

    gulp.watch([
            css_build + '/**/*.css',
            '*.html',
            // 'app/**', // Watch application files
            '!' + css_src + '/**', // Ignore files directly compiled by Gulp
            // '!' + js_src + '/**',
            // '!' + images_src + '/**',
            'public/**'
        ]).on('change', function(file) {
            server.changed(file.path);
        });
});

gulp.task('watch', function() {
    var process;
    function spawnChildren(e) {
        if(process) { process.kill(); }
        process = spawn('gulp', ['watching-task'], {stdio: 'inherit'});
    }

    gulp.watch('gulpfile.js', spawnChildren);
    spawnChildren();
});

gulp.task('watching-task', ['livereload'], function(){
    notify({
        title: "Gulp is watching...",
        message: "Don't forget to enable the LiveReload browser plugin."
    });
    gulp.watch(css_src + '/**/*.scss', ['css']);
    gulp.watch(js_src + '/**/*.js', ['js']);
    gulp.watch(bower_components + '/**/*.js', ['js']);
    // gulp.watch(images_src + '/**/*', ['images']);
    gulp.watch('app/**/*.php', ['phpunit']);
});

gulp.task('default', ['clean', 'css', 'js', 'images', 'phpunit']);