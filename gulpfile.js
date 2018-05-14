const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const imageResize = require('gulp-image-resize');
const sourcemaps = require('gulp-sourcemaps');
const uglifyES = require('gulp-uglify-es').default;
const webp = require('gulp-webp');
const cleanCSS = require('gulp-clean-css');
const del = require('del');
const vinylPaths = require('vinyl-paths');


gulp.task('clean', () => {
    return gulp.src('dist')
        .pipe(vinylPaths(del))
});

gulp.task('resize-images', (done) => {
    gulp.src('public/img/**/*.jpg')
        .pipe(imageResize({
            width: 20
        }))
        .pipe(gulp.dest('public/img/previews/'));
    done();
});

gulp.task('resize-static', (done) => {
    gulp.src('public/img/staticmap.png')
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


gulp.task('static-webp', (done) => {
    gulp.src('public/img/staticmap.png')
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
        .pipe(cleanCSS())
        .pipe(gulp.dest('public/css'))
        .pipe(browserSync.stream());
});
gulp.task('dist-styles', () => {
    return gulp.src('public/sass/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(cleanCSS())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/css'))
        .pipe(browserSync.stream());
});


gulp.task('dist-scripts', () => {
    return gulp.src('public/js/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(uglifyES())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/js'));
});

gulp.task('copy-html', () => {
    return gulp.src('public/*')
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-manifest', () => {
    return gulp.src('public/manifest.json')
        .pipe(gulp.dest('dist'));
});


gulp.task('copy-sw', () => {
    return gulp.src('service-worker.js')
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-images', () => {
    return gulp.src('./public/img/**/*')
        .pipe(gulp.dest('dist/img'));
});

gulp.task('dist', gulp.series('clean', gulp.parallel(
    'copy-html',
    'copy-images',
    'dist-styles',
    'dist-scripts',
)));


gulp.task('watch', () => {
    const watcher = gulp.watch('public/sass/**/*.scss', gulp.series('dev-styles'));
    watcher.on('change', (path, stats) => {
        console.log(`File ${path} was changed.  Running task.`);
    });
});


gulp.task('default', gulp.series('dev-styles', gulp.parallel('watch')), () => {
    browserSync.init({
        server: './public'
    });
});