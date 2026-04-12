#!/usr/bin/env node
/**
 * Add missing about_ translations for all languages
 * Ensures all 11 languages have complete About page translations
 */
const fs = require('fs');

const langFile = 'js/lang.js';
let content = fs.readFileSync(langFile, 'utf8');

// Complete about_ translations for languages that need them
const translations = {
  es: {
    about_hero_title: 'Nuestra <em>Historia</em>',
    about_hero_sub: '1993 — Split, Croacia',
    about_story_label: 'Nuestra Historia',
    about_story_title: 'Todo comenzó en <em>1993.</em>',
    about_story_p1: 'Todo comenzó en 1993 con una idea simple — que la luz puede cambiar la forma en que experimentamos el espacio. Tres décadas después, esa idea sigue siendo el corazón de todo lo que hacemos.',
    about_story_p2: 'De un pequeño taller, ST Arc se ha convertido en el nombre detrás de las decoraciones luminosas que embellecen hogares, plazas y calles en toda Croacia y Europa cada año. Crecimos lenta y cuidadosamente — proyecto a proyecto, ciudad a ciudad, temporada a temporada.',
    about_story_p3: 'Las tecnologías cambiaron, desde bombillas clásicas hasta iluminación LED moderna, pero lo que nos impulsa sigue siendo lo mismo: el deseo de crear momentos que la gente recuerda.',
    about_story_p4: 'Hoy en día, cada motivo se crea en nuestro taller en Solín, por manos de personas que aportan la misma atención al trabajo, ya sea creando una estrella clásica para una plaza local o una instalación única para el vestíbulo de un hotel. Amamos lo que hacemos — y creemos que se nota.',
    about_drive_label: 'Qué nos Impulsa',
    about_drive_title: 'Ese momento cuando se <em>enciende</em>',
    about_drive_p1: 'Después de 30 años, aún nos emociona más ese momento cuando se enciende la iluminación por primera vez y el espacio cobra vida. Cuando los niños se detienen frente a una figura de Papá Noel, cuando una plaza se llena de gente, cuando un pasaje ordinario se convierte en algo que se fotografía y se recuerda.',
    about_drive_p2: 'Ese momento es la razón por la que hacemos lo que hacemos.',
    about_drive_p3: 'Creemos que la luz no es solo decoración — es atmósfera, sentimiento, recuerdo. Por eso abordamos cada proyecto, simple o exigente, con la misma dosis de creatividad, precisión y buena voluntad.',
    about_process_label: 'Cómo Trabajamos',
    about_process_title: 'El mismo proceso, <em>siempre</em>',
    about_process_lead: 'Detrás de cada proyecto hay el mismo proceso: escuchamos, proponemos, producimos, instalamos y nos quedamos con usted. Nuestro equipo sigue cada detalle — desde el primer bosquejo hasta la última luz encendida — combinando nuestra propia producción, materiales de alta calidad y tecnologías modernas.',
    about_step1_name: 'Escuchamos',
    about_step1_desc: 'Cada proyecto comienza con una conversación. Entendemos su espacio, visión y necesidades.',
    about_step2_name: 'Proponemos',
    about_step2_desc: 'Nuestro equipo crea bocetos y propuestas adaptadas exactamente a sus requisitos.',
    about_step3_name: 'Producimos',
    about_step3_desc: 'Cada motivo se crea en nuestro taller — nuestras propias estructuras de acero inoxidable, iluminación LED.',
    about_step4_name: 'Instalamos',
    about_step4_desc: 'Configuramos en el sitio, cuidando cada detalle hasta que la última luz se encienda.',
    about_step5_name: 'Nos Quedamos con Usted',
    about_step5_desc: 'Apoyo durante toda la temporada — desde el primer día hasta el desmontaje.',
    about_closing_quote: 'Con la luz creamos experiencias que se recuerdan.',
    about_img1_alt: 'Instalación ST Arc — Teatro Nacional Croata',
    about_img1_caption: 'Zagreb — Teatro Nacional Croata',
    about_img2_alt: 'Calle Advent — túnel de luz',
    about_img2_caption: 'Zagreb — Calle Advent',
  },
  nl: {
    about_hero_title: 'Ons <em>Verhaal</em>',
    about_hero_sub: '1993 — Split, Kroatië',
    about_story_label: 'Ons Verhaal',
    about_story_title: 'Het begon allemaal in <em>1993.</em>',
    about_story_p1: 'Het begon allemaal in 1993 met een eenvoudig idee — dat licht de manier kan veranderen waarop we een ruimte ervaren. Drie decennia later blijft dat idee het hart van alles wat we doen.',
    about_story_p2: 'Vanuit een klein atelier is ST Arc uitgegroeid tot de naam achter lichtverstieringen die elk jaar huizen, stadspleinen en straten in heel Kroatië en Europa verfraaien. We groeien langzaam en voorzichtig — project per project, stad per stad, seizoen per seizoen.',
    about_story_p3: 'Technologieën veranderden, van klassieke gloeilampen tot moderne LED-verlichting, maar wat ons drijft blijft hetzelfde: het verlangen om momenten te creëren die mensen onthouden.',
    about_story_p4: 'Tegenwoordig wordt elk motief gemaakt in ons atelier in Solin, door handen van mensen die evenveel aandacht besteden aan het werk, of ze nu een klassieke ster voor een lokaal plein maken of een unieke installatie voor een hotellobby. We houden van wat we doen — en we denken dat het opvalt.',
    about_drive_label: 'Wat Drijft Ons',
    about_drive_title: 'Dat moment wanneer het <em>oplicht</em>',
    about_drive_p1: 'Na 30 jaar worden we nog steeds het meest blij van dat moment wanneer de verlichting voor het eerst wordt ingeschakeld en de ruimte tot leven komt. Wanneer kinderen voor een Kerstman-figuur stilstaan, wanneer een plein zich vult met mensen, wanneer een gewone doorgang iets wordt dat gefotografeerd en onthouden wordt.',
    about_drive_p2: 'Dat moment is de reden waarom we doen wat we doen.',
    about_drive_p3: 'Wij geloven dat licht niet zomaar decoratie is — het is sfeer, gevoel, herinnering. Daarom benaderen we elk project, eenvoudig of veeleisend, met evenveel creativiteit, precisie en goede wil.',
    about_process_label: 'Hoe Wij Werken',
    about_process_title: 'Hetzelfde proces, <em>elke keer</em>',
    about_process_lead: 'Achter elk project staat hetzelfde proces: we luisteren, we stellen voor, we produceren, we installeren en we blijven bij u. Ons team volgt elk detail — van de eerste schets tot de laatste ingeschakelde licht — combinatie van onze eigen productie, materialen van topkwaliteit en moderne technologieën.',
    about_step1_name: 'We Luisteren',
    about_step1_desc: 'Elk project begint met een gesprek. We begrijpen uw ruimte, visie en behoeften.',
    about_step2_name: 'We Stellen Voor',
    about_step2_desc: 'Ons team maakt schetsen en voorstellen die precies op uw vereisten zijn afgestemd.',
    about_step3_name: 'We Produceren',
    about_step3_desc: 'Elk motief wordt gemaakt in ons atelier — onze eigen roestvrijstalen structuren, LED-verlichting.',
    about_step4_name: 'We Installeren',
    about_step4_desc: 'We stellen in op locatie, zorgend voor elk detail tot het laatste licht brandt.',
    about_step5_name: 'We Blijven Bij U',
    about_step5_desc: 'Ondersteuning het hele seizoen — van dag één tot demontage.',
    about_closing_quote: 'Met licht creëren we ervaringen die onthouden worden.',
    about_img1_alt: 'ST Arc-installatie — Kroatisch Nationaal Theater',
    about_img1_caption: 'Zagreb — Kroatisch Nationaal Theater',
    about_img2_alt: 'Advent Street — lichttunnel',
    about_img2_caption: 'Zagreb — Advent Street',
  },
  pt: {
    about_hero_title: 'Nossa <em>História</em>',
    about_hero_sub: '1993 — Split, Croácia',
    about_story_label: 'Nossa História',
    about_story_title: 'Tudo começou em <em>1993.</em>',
    about_story_p1: 'Tudo começou em 1993 com uma ideia simples — que a luz pode mudar a forma como experimentamos o espaço. Três décadas depois, essa ideia continua sendo o coração de tudo o que fazemos.',
    about_story_p2: 'De um pequeno atelier, ST Arc cresceu e se tornou o nome por trás das decorações de luz que embelezam casas, praças e ruas em toda a Croácia e Europa todos os anos. Crescemos lentamente e com cuidado — projeto por projeto, cidade por cidade, estação por estação.',
    about_story_p3: 'As tecnologias mudaram, de lâmpadas clássicas para iluminação LED moderna, mas o que nos impulsiona continua sendo o mesmo: o desejo de criar momentos que as pessoas lembram.',
    about_story_p4: 'Até hoje, cada motivo é criado em nosso atelier em Solin, pelas mãos de pessoas que trazem a mesma atenção ao trabalho, seja criando uma estrela clássica para uma praça local ou uma instalação única para um saguão de hotel. Amamos o que fazemos — e achamos que se nota.',
    about_drive_label: 'O Que Nos Impulsiona',
    about_drive_title: 'Aquele momento quando <em>acende</em>',
    about_drive_p1: 'Após 30 anos, ainda nos anima mais aquele momento em que a iluminação é ligada pela primeira vez e o espaço ganha vida. Quando as crianças param diante de uma figura do Papai Noel, quando uma praça se enche de pessoas, quando uma passagem ordinária se transforma em algo que é fotografado e lembrado.',
    about_drive_p2: 'Aquele momento é o motivo pelo qual fazemos o que fazemos.',
    about_drive_p3: 'Acreditamos que a luz não é apenas decoração — é atmosfera, sensação, memória. É por isso que abordamos cada projeto, simples ou exigente, com uma dose igual de criatividade, precisão e boa vontade.',
    about_process_label: 'Como Trabalhamos',
    about_process_title: 'O mesmo processo, <em>toda vez</em>',
    about_process_lead: 'Por trás de cada projeto está o mesmo processo: ouvimos, propomos, produzimos, instalamos e ficamos com você. Nossa equipe acompanha cada detalhe — desde o primeiro esboço até a última luz acesa — combinando nossa própria produção, materiais de alta qualidade e tecnologias modernas.',
    about_step1_name: 'Ouvimos',
    about_step1_desc: 'Cada projeto começa com uma conversa. Compreendemos seu espaço, visão e necessidades.',
    about_step2_name: 'Propomos',
    about_step2_desc: 'Nossa equipe cria esboços e propostas exatamente adaptados aos seus requisitos.',
    about_step3_name: 'Produzimos',
    about_step3_desc: 'Cada motivo é criado em nosso atelier — nossas próprias estruturas de aço inoxidável, iluminação LED.',
    about_step4_name: 'Instalamos',
    about_step4_desc: 'Configuramos no local, cuidando de cada detalhe até que a última luz acenda.',
    about_step5_name: 'Ficamos com Você',
    about_step5_desc: 'Suporte durante toda a temporada — do primeiro dia até a desmontagem.',
    about_closing_quote: 'Com a luz, criamos experiências que são lembradas.',
    about_img1_alt: 'Instalação ST Arc — Teatro Nacional Croata',
    about_img1_caption: 'Zagreb — Teatro Nacional Croata',
    about_img2_alt: 'Rua Advent — túnel de luz',
    about_img2_caption: 'Zagreb — Rua Advent',
  },
  ru: {
    about_hero_title: 'Наша <em>История</em>',
    about_hero_sub: '1993 — Сплит, Хорватия',
  },
  zh: {
    about_hero_title: '我们的<em>故事</em>',
    about_hero_sub: '1993 — 斯普利特，克罗地亚',
  },
  ar: {
    about_hero_title: 'قصتنا <em>نحن</em>',
    about_hero_sub: '1993 — زغرب، كرواتيا',
  },
};

// Update each language
for (const [lang, keys] of Object.entries(translations)) {
  const pattern = new RegExp(`(${lang}: \\{[^}]*?)(\\n  \\}[,}])`, 's');

  if (!pattern.test(content)) {
    console.log(`⚠️ Could not find ${lang.toUpperCase()} block`);
    continue;
  }

  let keyContent = '';
  for (const [key, value] of Object.entries(keys)) {
    const escaped = value.replace(/"/g, '\\"');
    keyContent += `\n    ${key}: "${escaped}",`;
  }

  const match = content.match(pattern);
  if (match) {
    const closing = match[2];
    content = content.replace(pattern, `$1${keyContent}\n  ${closing.trim()}`);
    console.log(`✅ Updated ${lang.toUpperCase()}`);
  }
}

fs.writeFileSync(langFile, content, 'utf8');
console.log('\n✅ All missing translations added!');