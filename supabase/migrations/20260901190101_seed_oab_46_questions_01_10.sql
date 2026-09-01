-- Seed 46º EOU 2026 Tipo 1 - questões 1 a 10
begin;

insert into public.exam_questions (
  exam_id, question_number, area, prompt, options, correct_option,
  difficulty, sort_order, source_metadata
)
values (
  '46000000-2026-4000-8000-000000000001',
  1,
  'Ética Profissional e Estatuto da OAB',
  'Paloma, advogada gestante, compareceu ao Fórum da Comarca de Itaporanga, PB, para participar de uma audiência. Ao tentar estacionar no local, foi impedida de acessar a garagem sob a justificativa de que não havia vagas reservadas para gestantes. Além disso, foi obrigada a passar por um detector de metais, mesmo tendo informado de sua condição de gestante. Indignada, Paloma buscou esclarecer os seus direitos. Sobre a hipótese narrada, com base no Estatuto da OAB, assinale a afirmativa correta.',
  '[{"id": "A", "text": "Paloma, por ser advogada gestante, tem o direito de não ser submetida a detectores de metais, mas o estacionamento exclusivo só é garantido em Tribunais e Fóruns Federais, não nos Fóruns Estaduais."}, {"id": "B", "text": "Os direitos de Paloma, como o de não ser submetida aos detectores de metais e à reserva de vagas, são aplicáveis apenas em Tribunais Superiores, e não se estendem a Fóruns de Comarcas Estaduais."}, {"id": "C", "text": "Paloma, por ser advogada gestante, tem o direito de entrar em Fóruns e Tribunais sem ser submetida a detectores de metais e tem direito à reserva de vagas nas garagens dos Fóruns dos Tribunais."}, {"id": "D", "text": "Paloma tem o direito de entrada no Fórum sem ser submetida a detectores de metais, mas o direito à reserva de vagas em garagens para gestantes é uma mera liberalidade do Tribunal e não é garantido por lei."}]'::jsonb,
  'C',
  'oficial',
  1,
  '{"source":"46º EOU 2026 - Tipo 1","questionNumber":1}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 2, 'Ética Profissional e Estatuto da OAB',
  'Danilo, procurador de carreira, foi nomeado Procurador-Geral de sua instituição. Antes de assumir a Procuradoria-Geral do Estado, ele patrocinava várias causas trabalhistas contra empresas privadas e causas tributárias. Agora, Danilo está em dúvida se poderá continuar advogando nessas ações. Sobre a hipótese apresentada, com base nas disposições do Estatuto da OAB sobre incompatibilidades e impedimentos, assinale a afirmativa correta.',
  '[{"id": "A", "text": "Danilo está impedido de atuar em causas trabalhistas e tributárias contra a Fazenda Pública que o remunera, mas pode continuar patrocinando as causas contra empresas privadas."}, {"id": "B", "text": "Danilo poderá continuar patrocinando suas causas trabalhistas e tributárias, pois o cargo de Procurador-Geral do Estado não gera incompatibilidade ou impedimento para advogar em questões privadas."}, {"id": "C", "text": "Danilo poderá continuar patrocinando as causas tributárias, mas não as trabalhistas, pois apenas as causas tributárias contra a Fazenda Pública estão abrangidas pelo impedimento previsto no Estatuto da OAB."}, {"id": "D", "text": "Danilo não poderá continuar patrocinando suas causas trabalhistas e tributárias, pois o cargo de Procurador-Geral do Estado obsta o exercício da advocacia desvinculado da função que exerce, durante o período da investidura."}]'::jsonb,
  'D', 'oficial', 2, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":2}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 3, 'Ética Profissional e Estatuto da OAB',
  'Alfredo é graduado em Direito pela Universidade Beta, mas não foi aprovado no Exame da Ordem dos Advogados do Brasil (OAB). Durante a graduação, Alfredo não teve a oportunidade de estagiar em um escritório de advocacia. Recentemente, após já estar formado, surgiu a oportunidade de estagiar em um escritório credenciado pelo Conselho Seccional da OAB. Ele deseja saber se pode participar do estágio profissional de advocacia mesmo após a conclusão de seu curso e se seria possível inscrever-se no quadro de estagiários da OAB. Sobre a hipótese, com base no disposto no Art. 9º do Estatuto da Advocacia e da OAB, assinale a afirmativa correta.',
  '[{"id": "A", "text": "Alfredo não pode participar de estágio de advocacia, pois o estágio só é permitido para estudantes de Direito que ainda estejam cursando os últimos anos do curso jurídico."}, {"id": "B", "text": "Alfredo pode se inscrever no quadro de estagiários da OAB, mas somente se concluir o estágio profissional em uma instituição de ensino superior, e não em escritório credenciado pelo Conselho Seccional da OAB."}, {"id": "C", "text": "Alfredo pode participar do estágio profissional de advocacia e inscrever-se como estagiário da OAB, mesmo após a conclusão do curso, desde que o estágio seja realizado em escritório credenciado pela OAB."}, {"id": "D", "text": "Alfredo pode participar do estágio profissional, mas não poderá inscrever-se no quadro de estagiários da OAB, pois já concluiu a graduação em Direito e apenas alunos ainda cursando o ensino jurídico podem obter essa inscrição."}]'::jsonb,
  'C', 'oficial', 3, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":3}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 4, 'Ética Profissional e Estatuto da OAB',
  'Os advogados Eduardo e Diogo são sócios de uma sociedade profissional de advogados, cujos atos constitutivos foram devidamente registrados e aprovados pelo Conselho Seccional da OAB na base territorial em que está localizada a sua sede. No entanto, Eduardo foi contratado por Afonso para representá-lo em uma ação de alimentos movida por sua esposa Dalila, e Diogo foi contratado por Dalila para representá-la na mesma ação. Os advogados desejam saber se podem continuar com essas representações, tendo em vista que são sócios da mesma sociedade de advogados. Sobre o caso narrado, com base no Art. 15 do Estatuto da Advocacia e da OAB, assinale a afirmativa correta.',
  '[{"id": "A", "text": "Eduardo e Diogo não podem representar, em juízo, clientes com interesses opostos, por serem sócios da mesma sociedade de advogados."}, {"id": "B", "text": "Eduardo e Diogo podem representar Afonso e Dalila em juízo, desde que firmem compromisso por escrito de que não haverá conflito de interesse entre os dois advogados."}, {"id": "C", "text": "Eduardo e Diogo podem continuar com as respectivas representações de Afonso e Dalila, desde que informem previamente ao Juiz que ambos fazem parte da mesma sociedade."}, {"id": "D", "text": "Eduardo e Diogo podem continuar com as representações, desde que cada um atue de forma independente dentro da sociedade de advogados, contando com corpo auxiliar próprio."}]'::jsonb,
  'A', 'oficial', 4, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":4}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 5, 'Ética Profissional e Estatuto da OAB',
  'Mateus, advogado regularmente inscrito na OAB, contratou Marcos, profissional da área de vendas, para abordar pessoas nas imediações da agência do Instituto Nacional do Seguro Social da sua cidade, visando à captação de causas previdenciárias. Foi acertado que Marcos teria participação nos honorários advocatícios das causas que conseguisse agenciar. Constatados os fatos, e após o devido processo administrativo disciplinar, o Tribunal de Ética e Disciplina do Conselho Seccional competente aplicou a pena de censura a Mateus. Considerando o enunciado e o Estatuto da Advocacia e da OAB, assinale a afirmativa correta.',
  '[{"id": "A", "text": "Havendo circunstâncias atenuantes, será possível substituir a sanção de censura pela aplicação isolada de multa."}, {"id": "B", "text": "Transitada em julgado a decisão, a sanção aplicada a Mateus deverá constar dos seus assentamentos, dando-se ampla publicidade nos meios oficiais."}, {"id": "C", "text": "A gravidade da conduta infracional de Mateus não permite a conversão da pena de censura em advertência, ainda que verificada a ausência de punição disciplinar anterior."}, {"id": "D", "text": "A circunstância de Mateus exercer de modo assíduo e proficiente mandato em cargo ou qualquer órgão da OAB, caso comprovada, deverá ser considerada pelo Tribunal na aplicação da sanção disciplinar."}]'::jsonb,
  'D', 'oficial', 5, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":5}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 6, 'Ética Profissional e Estatuto da OAB',
  'Abelardo é contratado para representar o milionário Everardo em uma causa cível de importante vulto. Ficou combinado que, em caso de êxito, Abelardo fará jus a uma joia de elevadíssimo valor, a título de honorários. Sucede que, depois de ganhar a causa, Everardo sofreu revés na justiça criminal, quando uma decisão judicial determinou o bloqueio de todo o seu patrimônio pela suspeita de crimes financeiros. Nesse caso, à luz do Estatuto da Ordem dos Advogados do Brasil e do Código de Ética e Disciplina, assinale a afirmativa correta.',
  '[{"id": "A", "text": "Abelardo poderá requerer ao Juiz Criminal o desbloqueio de até 20% dos bens de Everardo para o pagamento de seus honorários e dos demais custos com a defesa."}, {"id": "B", "text": "Abelardo poderá, diante do bloqueio, participar dos bens particulares de Everardo, de forma excepcional, considerada a impossibilidade de pagamento por outro meio, ainda que tal forma de pagamento não tenha sido pactuada."}, {"id": "C", "text": "A cláusula de honorários de êxito ou quota litis não é vedada, mas deve necessariamente ser expressa em pecúnia, de modo que, prevendo-se a entrega de uma joia, constata-se a nulidade que determina que Abelardo só fará jus aos honorários de sucumbência, se houver."}, {"id": "D", "text": "A cláusula de honorários de êxito ou quota litis é vedada, de sorte que será necessário proceder ao arbitramento dos honorários de Abelardo, em remuneração compatível com o trabalho e o valor econômico da questão, observado obrigatoriamente o disposto no Art. 85 do Código de Processo Civil."}]'::jsonb,
  'A', 'oficial', 6, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":6}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 7, 'Ética Profissional e Estatuto da OAB',
  'Frederico, advogado, após alcançar grande sucesso na advocacia, decidiu se dedicar também à construção civil, passando a atuar simultaneamente nas duas áreas. Diante da afinidade temática entre o Direito Imobiliário e o setor de construção civil, Frederico teve a ideia de unir ambas as atividades em um único escritório, oferecendo aos clientes consultoria jurídica e serviços de incorporação imobiliária. Para divulgar o seu novo empreendimento, contratou um escritório de marketing, que produziu uma campanha publicitária conjunta, ressaltando seus trabalhos como advogado e como empreendedor da construção civil. Sobre o fato narrado, com base no Estatuto da OAB, assinale a afirmativa correta.',
  '[{"id": "A", "text": "É possível a divulgação conjunta, desde que respeitados o decoro e a dignidade da advocacia, cabendo ao Tribunal de Ética e Disciplina da OAB avaliar a adequação da publicidade."}, {"id": "B", "text": "É permitida a divulgação conjunta apenas quando a outra atividade também for regulamentada por entidade de classe, hipótese em que a OAB poderá celebrar o convênio para a publicidade cruzada."}, {"id": "C", "text": "É vedada a divulgação conjunta de advocacia com outra atividade, ainda que exercida pela mesma pessoa e que haja afinidade entre os ramos, como ocorre entre a advocacia imobiliária e a construção civil."}, {"id": "D", "text": "Em regra, não é possível divulgar a advocacia em conjunto com outra atividade, mas nesse caso seria permitido, pois as atividades são exercidas por uma mesma pessoa e possuem afinidade temática, inexistindo conflito ético."}]'::jsonb,
  'C', 'oficial', 7, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":7}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 8, 'Ética Profissional e Estatuto da OAB',
  'O advogado Toledo atua na defesa de Tício, investigado por crimes de corrupção e lavagem de dinheiro. Durante as investigações, o próprio Toledo passou a ser investigado por suposta participação em atos ilícitos praticados por seu cliente. Em troca de benefícios penais, o Ministério Público ofereceu a possibilidade de firmar acordo de colaboração premiada ao advogado, desde que ele fornecesse informações sobre Tício e outros envolvidos. Com base no Estatuto da OAB, assinale a afirmativa correta.',
  '[{"id": "A", "text": "O advogado pode colaborar contra seu cliente se a colaboração resultar apenas em redução de pena, sendo vedada a extinção total da punibilidade em razão de delação premiada."}, {"id": "B", "text": "O advogado não pode celebrar colaboração premiada contra o cliente atual, mas poderá fazê-lo em relação a um ex-cliente, desde que não mais exista vínculo profissional formal entre ambos."}, {"id": "C", "text": "O advogado poderá firmar colaboração premiada em face de seu cliente, desde que o acordo seja autorizado judicialmente, hipótese em que ficará isento de punição administrativa perante o Tribunal de Ética e Disciplina."}, {"id": "D", "text": "O advogado não pode efetuar colaboração premiada contra quem seja ou tenha sido seu cliente, e a inobservância dessa regra poderá acarretar processo disciplinar com aplicação de uma sanção de exclusão dos quadros da OAB, sem prejuízo da responsabilização penal."}]'::jsonb,
  'D', 'oficial', 8, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":8}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 9, 'Filosofia do Direito',
  'Leia os fragmentos a seguir. Sócrates estava sentado à porta de sua casa. Nesse momento, passa um homem correndo e atrás dele vem um grupo de soldados. Um dos soldados então grita: agarre esse sujeito, ele é um ladrão! Ao que responde Sócrates: que você entende por ‘ladrão’? (...) Questões zetéticas têm uma função especulativa explícita e são infinitas. Questões dogmáticas têm uma função diretiva explícita e são finitas. Nas primeiras, o problema tematizado é configurado como um ser (que é algo?). Nas segundas, a situação nelas captada configura-se como um dever-ser (como deve-ser algo?). Por isso, o enfoque zetético visa saber o que é uma coisa. Já o enfoque dogmático preocupa-se em possibilitar uma decisão e orientar ação. (FERRAZ JUNIOR, Tercio Sampaio. Introdução ao Estudo do direito: técnica, decisão, dominação.) De acordo com a terminologia utilizada pelo Professor Tercio Sampaio Ferraz Junior, assinale a afirmativa correta.',
  '[{"id": "A", "text": "O enfoque dado por Sócrates pode ser considerado dogmático, pois coloca em dúvida o próprio conceito de ladrão utilizado pelo soldado."}, {"id": "B", "text": "A acentuação da dúvida e do aspecto ontológico da conduta de Sócrates denotam uma característica típica das questões zetéticas."}, {"id": "C", "text": "A utilização dos conceitos de roubo e furto previstos no Código Penal para descaracterizar a imputação de um homem correndo como sendo um ladrão é tipicamente zetética."}, {"id": "D", "text": "O enfoque zetético deve ceder espaço para a função dogmática, pois o Direito no mundo atual exige decisões técnicas, tornando contraproducente especulações ontológicas."}]'::jsonb,
  'B', 'oficial', 9, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":9}'::jsonb
);

insert into public.exam_questions (exam_id, question_number, area, prompt, options, correct_option, difficulty, sort_order, source_metadata)
values (
  '46000000-2026-4000-8000-000000000001', 10, 'Filosofia do Direito',
  'Em decisão histórica, o Supremo Tribunal Federal (STF) aplicou a lei de greve do setor privado, Lei nº 7.783/1989, aos servidores públicos, pois, apesar de existir previsão constitucional expressa desse direito ao setor público, não havia lei que a regulamentasse, impedindo o seu exercício. Ao verificar a ausência da norma e das razões de semelhança para aplicar o normativo já existente, assinale a opção que melhor explica a técnica utilizada pelo STF para justificar o seu julgamento.',
  '[{"id": "A", "text": "Costumes."}, {"id": "B", "text": "Equidade."}, {"id": "C", "text": "Analogia."}, {"id": "D", "text": "Princípios Gerais de Direito."}]'::jsonb,
  'C', 'oficial', 10, '{"source":"46º EOU 2026 - Tipo 1","questionNumber":10}'::jsonb
);

commit;
