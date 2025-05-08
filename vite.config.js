export default {
    build: {
        target: 'es2022', // Or 'esnext'
    },
    esbuild: {
        supported: { 'top-level-await': true },
    },
};