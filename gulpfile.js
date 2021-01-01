const { task, src, dest, watch, series, parallel } = require('gulp')
const { ModuleKind, ScriptTarget } = require('typescript')
const liveroad = require('gulp-livereload')

const production = (process.env.NODE_ENV === 'production') ? true : false

task('css', () => {
    const tailwindcss = require('tailwindcss')
    const autoprefixer = require('autoprefixer')
    const cssnano = require('cssnano')({ preset: 'default' })
    const purgeCss = require('@fullhuman/postcss-purgecss')({ content: ['./src/**/*.html', './src/**/*.js', './src/**/*.ts'] })

    const postcss = require('gulp-postcss')
    const concat = require('gulp-concat')

    const merge = require('merge2')

    // -----------------------------------------------------------------------

    const pluginsPreMerge = []
    if (production) {
        pluginsPreMerge.push(purgeCss)
        pluginsPreMerge.push(autoprefixer)
    } else {
        pluginsPreMerge.push(autoprefixer)
    }

    const tailwindcssPipe = src('src/css/tailwindcss.css').pipe(postcss([tailwindcss, autoprefixer]))
    const otherCssPipe = src(['src/css/**/*.css', '!src/css/tailwindcss.css']).pipe(postcss(pluginsPreMerge))
    const mergedPipe = merge([tailwindcssPipe, otherCssPipe]).pipe(concat('css/main.css'))

    if (production) { mergedPipe.pipe(postcss([cssnano])) }
    return mergedPipe.pipe(dest('build')).pipe(liveroad())
})

task('js', () => {
    const typescript = require('gulp-typescript')({ module: 'ES2020', moduleResolution: 'Classic', target: 'ES2020' })
    const minifier = require('gulp-minify')()
    const concat = require('gulp-concat')
    const merge = require('merge2')

    const js = src(['src/js/**/*.js'])
    const ts = src(['src/js/**/*.ts']).pipe(typescript)
    const merged = merge([js, ts]).pipe(concat('js/main.js'))

    if (production) { merged.pipe(minifier) }
    return merged.pipe(dest('build')).pipe(liveroad())
})

task('html', () => {
    const htmlmin = require('gulp-htmlmin')()

    const html = src(['src/**/*.html'])

    if (production) { html.pipe(htmlmin) }
    return html.pipe(dest('build')).pipe(liveroad())
})

task('svg', () => {
    const minifier = require('gulp-svgmin')()

    const svg = src(['src/**/*.svg'])

    if (production) { svg.pipe(minifier) }
    return svg.pipe(dest('build')).pipe(liveroad())
})

task('static', () => { return src(['src/**/*', '!src/**/*.css', '!src/**/*.js', '!src/**/*.ts', '!src/**/*.html', '!src/**/*.svg']).pipe(dest('build')).pipe(liveroad()) })

task('compressBuild', () => {
    const brotli = require('gulp-brotli')
    const gzip = require('gulp-gzip')
    const merge = require('merge2')
    const zlib = require('zlib')

    const brotliCompress = src(['build/**/*'])
    const gzipCompress = src(['build/**/*'])

    return merge([brotliCompress, gzipCompress]).pipe(dest('dist'))
})

task('watchCss', () => { return watch(['src/**/*.css'], series('css')) })
task('watchJs', () => { return watch(['src/**/*.js', 'src/**/*.ts'], series('js')) })
task('watchHtml', () => { return watch(['src/**/*.html'], series('html')) })
task('watchSvg', () => { return watch(['src/**/*.svg'], series('svg')) })
task('watchStatic', () => { return watch(['src/**/*', '!src/**/*.css', '!src/**/*.js', '!src/**/*.ts', '!src/**/*.html', '!src/**/*.svg'], series('static')) })
task('startLivereload', () => { return liveroad.listen({ port: 5000 }) })
task('startServer', () => {
    const sirv = require('sirv')('build')
    const polka = require('polka')()
    const connectLivereload = require('connect-livereload')({ port: 5000 })

    polka.use(connectLivereload, sirv).listen(8080)
})

exports.watch = parallel('watchCss', 'watchJs', 'watchHtml', 'watchSvg', 'watchStatic', 'startLivereload', 'startServer')
exports.default = parallel('css', 'js', 'html', 'svg', 'static')
exports.distribute = series(parallel('css', 'js', 'html', 'svg', 'static'), 'compressBuild')