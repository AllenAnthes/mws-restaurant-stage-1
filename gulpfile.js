const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const imageResize = require('gulp-image-resize');
const webp = require('gulp-webp');


gulp.task('resize-images', (done) => {
    gulp.src('public/img/**/*.jpg')
        .pipe(imageResize({
            width: 20
        }))
        .pipe(gulp.dest('public/img/previews/'));
    done();
});

gulp.task('images-webp', (done) => {
    gulp.src('public/img/**/*.jpg')
        .pipe(webp())
        .pipe(gulp.dest('public/img'));
    done();
});


gulp.task('dev-styles', () => {
    return gulp.src('public/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(gulp.dest('public/css'))
        .pipe(browserSync.stream());
});

gulp.task('watch', () => {
    const watcher = gulp.watch('public/sass/**/*.scss', gulp.series('dev-styles'));
    watcher.on('change', (path, stats) => {
        console.log(`File ${path} was changed.  Running task.`);
    });
});


gulp.task('default', gulp.parallel('dev-styles'), (done) => {
    const watcher = gulp.watch('public/sass/**/*.scss', gulp.parallel(['dev-styles']));
    // gulp.watch('dist/index.html').on('change', browserSync.reload);
    watcher.on('change', (e) => {
        console.log(`File ${event.path} was ${event.type},  running task.`);
    });

    // browserSync.init({
    //     server: './dist'
    // });
    // done();
});