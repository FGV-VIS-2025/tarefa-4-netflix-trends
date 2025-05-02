# Dashboard para busca dos filmes e séries da Netflix

Nossa visualização se propõe a oferecer ao leitor liberdade para explorar e analisar títulos presentes na Netflix de interesse, por meio de filtros e interações dinâmicas. A visualização não só permite que o usuário faça pesquisas dinâmicas dentro do catálogo da Netflix mas também faça análises das suas notas IMDb de acordo com o agrupamento criado pelos filtros. A visualização pode ser encontrada e experimentada no link: https://fgv-vis-2025.github.io/tarefa-4-netflix-trends/

Como fonte dos dados utilizamos o dataset [Netflix Movies and TV Shows](https://www.kaggle.com/datasets/victorsoeiro/netflix-tv-shows-and-movies), que encontramos no [Kaggle](https://www.kaggle.com/). No link encontramos 2 datasets. O primeiro é composto por mais de 5 mil títulos da Netflix, incluindo filmes e séries. E o segundo contém os atores e diretores que trabalharam em cada um dos filmes/séries. As principais colunas dos datasets são:

![image](static/imgs/titles_data.png)
*Dataset com os filmes/series*

![image](static/imgs/credits_data.png)
*Dataset com atores e diretores*

## Decisões de Design

Como nossa ideia era oferecer ao usuário liberdade para explorar os títulos da Netflix, nossa ideia foi criar um deshboard que serviria como uma plataforma de exploração para os usuários. Na prática temos um conjunto de gráficos em que o gráfico de pontos é o principal, trazendo uma relação de Nota IMDb com o ano de lançamento
