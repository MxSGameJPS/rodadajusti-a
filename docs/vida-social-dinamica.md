# Vida social dinâmica

A vida social do Rota da Justiça passa a ser uma camada de simulação que compete por tempo, dinheiro e energia com a rotina jurídica.

## Medidores

- **Atributo social**: representa convívio, equilíbrio pessoal e manutenção da vida fora do trabalho.
- **Capital social**: representa networking, circulação profissional e contatos que podem ganhar importância ao longo da carreira.
- **Energia**: estado temporário do personagem. Noites longas podem causar cansaço ou exaustão; viagens de descanso podem recuperar energia.
- **Relacionamentos individuais**: Dr. Roberto, Mariana, Dr. Felipe, Carlos e parceiro(a) possuem proximidade própria.

## Convites

O motor escolhe oportunidades de forma determinística conforme a data do jogo e o perfil do personagem. Entre os eventos possíveis estão:

- almoço com Dr. Roberto;
- almoço com outro advogado;
- jantar com amigo;
- jantar a dois;
- bar com Mariana e equipe;
- jantar de networking;
- fim de semana na Serra;
- fim de semana na praia;
- fim de semana na montanha.

Cada convite pode ser aceito ou recusado. Recusas podem afetar relações pessoais; aceitar consome dinheiro e tempo.

## Conflito com a carreira

Quando existe processo ativo, o convite informa o risco profissional. Programas sociais podem consumir horas da janela de preparação do caso. Se o processo tiver audiência jogável, o jogo avisa que chegar cansado pode prejudicar a atuação oral.

A condição física gera modificador limitado na audiência:

- **Cansado**: pequeno redutor;
- **Exausto**: redutor moderado;
- **Descansado**: pequeno bônus;
- **Equilibrado**: sem modificador.

Esse modificador nunca substitui prova, investigação, estratégia, prazo ou decisões do jogador. Ele apenas compõe o resultado da atuação oral.

## Persistência

A estrutura continua usando o armazenamento local por carreira já adotado pela vida profissional. Estados antigos são normalizados para a nova versão sem migration de banco.
