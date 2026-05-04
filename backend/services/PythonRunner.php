<?php

class PythonRunner
{

    // Ejecuta el scraper de Python en segundo plano
    public function runScraper($auditId, $url)
    {
        // Ruta al script Python
        $pythonScript = __DIR__ . '/../python/scraper.py';

        // Comando para ejecutar Python, los parámetros se pasan: audit_id, url
        $command = "python " . escapeshellarg($pythonScript) . " " . escapeshellarg($auditId) . " " . escapeshellarg($url);

        // Ejecutar comando en segundo plano (no bloquea) para Windows
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            pclose(popen("start /B " . $command, "r"));
        } else {
            // Para Linux/Mac
            shell_exec($command . " > /dev/null 2>&1 &");
        }

        return true;
    }

    // Ejecuta el scraper de Python de forma síncrona y devuelve el resultado
    public function runScraperSync($auditId, $url)
    {
        $pythonScript = __DIR__ . '/../python/scraper.py';
        $command = "python " . escapeshellarg($pythonScript) . " " . escapeshellarg($auditId) . " " . escapeshellarg($url);

        // Ejecuta y obtiene la salida del comando (útil para debugging o si el script devuelve resultados)
        $output = shell_exec($command . " 2>&1");

        if ($output === null) {
            return null;
        }

        // Intentar parsear como JSON
        $result = json_decode($output, true);
        return $result;
    }
}
