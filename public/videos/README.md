# Vídeos cinematográficos — Rota da Justiça

## Abertura principal

Arquivo:

`rota-da-justica-intro.mp4`

Caminho consumido pelo jogo:

`/videos/rota-da-justica-intro.mp4`

A abertura principal usa `autoplay`, `muted` e `playsInline`. O botão ENTRAR aparece após 5 segundos. Caso o arquivo não exista ou falhe, o jogo exibe um fallback visual e continua permitindo a entrada normalmente.

Para forçar a intro novamente durante testes, abra a aplicação com `?intro=1`.

## Início da carreira — pós-login

Coloque o vídeo criado no Google Flow nesta pasta com o nome exato:

`inicio-carreira.mp4`

Caminho consumido pelo jogo:

`/videos/inicio-carreira.mp4`

Este vídeo é exibido somente para uma carreira ainda não iniciada, depois do login e antes da tela de contratação como estagiário.

Regras desta cena:
- `autoplay`
- `muted`
- `playsInline`
- **sem looping**
- ao terminar, a cena esmaece por aproximadamente 900 ms
- depois da transição, o jogo abre a carreira em `/jogo`
- se o vídeo estiver ausente durante o desenvolvimento, existe um fallback visual e o jogador não fica preso na rota

## Formato recomendado

- MP4 (H.264)
- 1920x1080
- 16:9
- entre 12 e 18 segundos para a cena de início da carreira
- sem texto ou logotipos gravados no vídeo
- compressão web para carregamento rápido
