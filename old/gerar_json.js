// Usamos o módulo 'fs' (File System), que já vem com o Node.js, para salvar arquivos.
import fs from 'fs';

// --- Configurações ---
const API_URL_BASE = 'https://api.jikan.moe/v4/anime';
const NOME_ARQUIVO_SAIDA = 'animes_completos.json';
const PAUSA_ENTRE_PAGINAS_MS = 1000; 
const MAX_TENTATIVAS_POR_PAGINA = 5; 
const PAUSA_RETRY_MS = 5000; 

/**
 * Função principal para buscar todos os animes de forma paginada e robusta.
 */
async function buscarTodosOsAnimes() {
    let todosOsAnimes = [];
    let paginaAtual = 1; 
    let temProximaPagina = true;

    console.log("Iniciando a busca de todos os animes da API Jikan. Isso pode levar vários minutos...");

    while (temProximaPagina) {
        let sucessoNaPagina = false;

        for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_POR_PAGINA; tentativa++) {
            const url = `${API_URL_BASE}?page=${paginaAtual}&limit=25`;
            
            try {
                console.log(`Buscando página ${paginaAtual} (Tentativa ${tentativa})...`);
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Erro na API: ${response.statusText} (Status: ${response.status})`);
                }

                const data = await response.json();

                if (!data.data || data.data.length === 0) {
                    temProximaPagina = false;
                    break; 
                }

                // Extrai os dados, agora incluindo também o campo 'type'.
                const animesDaPagina = data.data.map(anime => ({
                    anime_id: anime.mal_id,
                    name: anime.title,
                    type: anime.type // <-- ADICIONAMOS ESTA LINHA
                }));
                todosOsAnimes.push(...animesDaPagina);

                temProximaPagina = data.pagination?.has_next_page || false;
                console.log(`Página ${paginaAtual} processada. Total de animes: ${todosOsAnimes.length}`);
                
                sucessoNaPagina = true;
                break; 

            } catch (error) {
                console.error(`Falha na tentativa ${tentativa} para a página ${paginaAtual}: ${error.message}`);
                if (tentativa === MAX_TENTATIVAS_POR_PAGINA) {
                    console.error("Número máximo de tentativas atingido. Abortando a busca.");
                    temProximaPagina = false;
                } else {
                    console.log(`Aguardando ${PAUSA_RETRY_MS / 1000} segundos para tentar novamente...`);
                    await new Promise(resolve => setTimeout(resolve, PAUSA_RETRY_MS));
                }
            }
        }
        
        if (!sucessoNaPagina && temProximaPagina) {
            break;
        }

        if (temProximaPagina) {
            paginaAtual++;
            await new Promise(resolve => setTimeout(resolve, PAUSA_ENTRE_PAGINAS_MS));
        }
    }

    console.log(`\nBusca finalizada! Total de ${todosOsAnimes.length} animes encontrados.`);

    try {
        fs.writeFileSync(NOME_ARQUIVO_SAIDA, JSON.stringify(todosOsAnimes, null, 2));
        console.log(`Arquivo "${NOME_ARQUIVO_SAIDA}" salvo com sucesso!`);
    } catch (error) {
        console.error("Erro ao salvar o arquivo JSON:", error);
    }
}

// Executa a função principal
buscarTodosOsAnimes();