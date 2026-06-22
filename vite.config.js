import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

const MIME = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
};

function serveStaticDirs(dirs) {
    return {
        name: 'serve-static-dirs',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const urlPath = req.url.split('?')[0];
                const matched = dirs.some((d) => urlPath.startsWith(d));
                if (!matched) return next();

                const filePath = path.join(process.cwd(), urlPath);
                if (!fs.existsSync(filePath)) return next();

                const ext = path.extname(filePath);
                res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
                fs.createReadStream(filePath).pipe(res);
            });
        },
    };
}

export default defineConfig({
    publicDir: false,
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), 'src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    plugins: [
        serveStaticDirs(['/img/', '/sound/']),
    ],
    build: {
        outDir: 'dist',
    },
});