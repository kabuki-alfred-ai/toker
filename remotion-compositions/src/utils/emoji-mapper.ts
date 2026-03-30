import type { EmojiName } from '@remotion/animated-emoji'
import type { WordSegment, EmojiEvent } from '../components/types'

export type { EmojiEvent }

/**
 * Raw keyword entries as an array to avoid duplicate-key TS errors.
 * Covers EN, FR, ES, PT, DE, IT, NL, AR (romanized), RU (romanized),
 * TR, PL, JA (romanized), KO (romanized), ZH (pinyin), HI (romanized), ID/MS.
 * Semantics are broad: "fire" = excitement, energy, hype, passion, intensity…
 */
const RAW_ENTRIES: [string, EmojiName][] = [

  // ── 🔥 FIRE — excitement, hype, energy, heat, intensity, passion ───────────
  // EN
  ['fire', 'fire'], ['lit', 'fire'], ['hot', 'fire'], ['flames', 'fire'], ['flame', 'fire'],
  ['blazing', 'fire'], ['burning', 'fire'], ['scorching', 'fire'], ['sizzling', 'fire'],
  ['incredible', 'fire'], ['insane', 'fire'], ['unreal', 'fire'], ['epic', 'fire'],
  ['banger', 'fire'], ['beast', 'fire'], ['bop', 'fire'], ['slaps', 'fire'], ['bussin', 'fire'],
  ['wild', 'fire'], ['nuts', 'fire'], ['heat', 'fire'], ['drip', 'fire'], ['banging', 'fire'],
  ['ripping', 'fire'], ['straight', 'fire'], ['absolute', 'fire'],
  // FR
  ['feu', 'fire'], ['incroyable', 'fire'], ['dingue', 'fire'], ['ouf', 'fire'], ['chaud', 'fire'],
  ['brulant', 'fire'], ['enflamme', 'fire'], ['chauffe', 'fire'], ['excitation', 'fire'],
  ['excite', 'fire'], ['enthousiasmant', 'fire'], ['passionnant', 'fire'], ['intense', 'fire'],
  // ES
  ['fuego', 'fire'], ['ardiente', 'fire'], ['increible', 'fire'], ['brutal', 'fire'],
  ['bestial', 'fire'], ['salvaje', 'fire'], ['tremendo', 'fire'], ['alucinante', 'fire'],
  ['flipante', 'fire'], ['locura', 'fire'], ['mola', 'fire'], ['pasion', 'fire'],
  // PT
  ['fogo', 'fire'], ['incrivel', 'fire'], ['absurdo', 'fire'], ['brabo', 'fire'],
  ['irado', 'fire'], ['demais', 'fire'], ['brasa', 'fire'], ['ardor', 'fire'],
  ['paixao', 'fire'], ['vibrando', 'fire'],
  // DE
  ['feuer', 'fire'], ['wahnsinn', 'fire'], ['krass', 'fire'], ['heftig', 'fire'],
  ['geil', 'fire'], ['abgefahren', 'fire'], ['hammer', 'fire'], ['scharf', 'fire'],
  ['heis', 'fire'], ['baller', 'fire'],
  // IT
  ['fuoco', 'fire'], ['pazzesco', 'fire'], ['spettacolare', 'fire'], ['figo', 'fire'],
  ['caldo', 'fire'], ['assurdo', 'fire'],
  // NL
  ['heet', 'fire'], ['gek', 'fire'], ['waanzinnig', 'fire'], ['vuur', 'fire'],
  // RU (romanized)
  ['ogon', 'fire'], ['zhara', 'fire'], ['bezumno', 'fire'],
  // AR (romanized)
  ['nar', 'fire'], ['harara', 'fire'], ['moudhish', 'fire'], ['ra2i3', 'fire'],
  // TR
  ['ates', 'fire'], ['yangin', 'fire'], ['muhtesem', 'fire'], ['inanilmaz', 'fire'],
  // KO (romanized)
  ['daebak', 'fire'], ['jjang', 'fire'], ['micheo', 'fire'], ['heol', 'fire'],
  // JA (romanized)
  ['sugoi', 'fire'], ['yabai', 'fire'], ['maji', 'fire'], ['saikou', 'fire'],
  // ZH (pinyin)
  ['niubi', 'fire'], ['shuai', 'fire'], ['bang', 'fire'],
  // HI (romanized)
  ['zabardast', 'fire'], ['kamaal', 'fire'], ['jalwa', 'fire'],
  // ID
  ['mantap', 'fire'], ['gila', 'fire'], ['keren', 'fire'], ['panas', 'fire'],

  // ── 🤯 MIND-BLOWN — shock, revelation, impossibility, WTF ─────────────────
  // EN
  ['wtf', 'mind-blown'], ['omg', 'mind-blown'], ['unbelievable', 'mind-blown'],
  ['impossible', 'mind-blown'], ['crazy', 'mind-blown'], ['shocking', 'mind-blown'],
  ['mindblowing', 'mind-blown'], ['speechless', 'mind-blown'], ['surreal', 'mind-blown'],
  ['unexpected', 'mind-blown'], ['twist', 'mind-blown'], ['plot', 'mind-blown'],
  ['insane', 'mind-blown'],
  // FR
  ['inimaginable', 'mind-blown'], ['hallucinant', 'mind-blown'], ['choquant', 'mind-blown'],
  ['choc', 'mind-blown'], ['sidere', 'mind-blown'], ['impensable', 'mind-blown'],
  ['inconcevable', 'mind-blown'], ['fou', 'mind-blown'], ['folle', 'mind-blown'],
  ['tare', 'mind-blown'],
  // ES
  ['alucino', 'mind-blown'], ['flipando', 'mind-blown'], ['impresionante', 'mind-blown'],
  ['sorprendente', 'mind-blown'], ['loco', 'mind-blown'], ['loca', 'mind-blown'],
  ['alucinado', 'mind-blown'],
  // PT
  ['inacreditavel', 'mind-blown'], ['surpreendente', 'mind-blown'], ['louco', 'mind-blown'],
  ['chocante', 'mind-blown'], ['impossivel', 'mind-blown'],
  // DE
  ['unglaublich', 'mind-blown'], ['verruckt', 'mind-blown'], ['schockierend', 'mind-blown'],
  ['unfassbar', 'mind-blown'], ['irre', 'mind-blown'],
  // IT
  ['sconcertante', 'mind-blown'], ['pazzo', 'mind-blown'], ['impensabile', 'mind-blown'],
  // TR
  ['sasirtici', 'mind-blown'], ['deli', 'mind-blown'],
  // JA
  ['masaka', 'mind-blown'], ['uso', 'mind-blown'], ['eeeh', 'mind-blown'],
  // AR
  ['mostahil', 'mind-blown'],
  // ID
  ['gokil', 'mind-blown'],

  // ── ❤️ RED-HEART — love, affection, deep care, passion ───────────────────
  // EN
  ['love', 'red-heart'], ['heart', 'red-heart'], ['adore', 'red-heart'],
  ['cherish', 'red-heart'], ['beloved', 'red-heart'], ['darling', 'red-heart'],
  ['romance', 'red-heart'], ['romantic', 'red-heart'],
  // FR
  ['amour', 'red-heart'], ['coeur', 'red-heart'], ['aime', 'red-heart'],
  ['cheri', 'red-heart'], ['romantique', 'red-heart'], ['tendresse', 'red-heart'],
  ['affection', 'red-heart'],
  // ES
  ['amor', 'red-heart'], ['corazon', 'red-heart'], ['quiero', 'red-heart'],
  ['enamorado', 'red-heart'],
  // PT
  ['coracao', 'red-heart'], ['amo', 'red-heart'], ['apaixonado', 'red-heart'],
  // DE
  ['liebe', 'red-heart'], ['herz', 'red-heart'], ['verliebt', 'red-heart'], ['liebling', 'red-heart'],
  // IT
  ['amore', 'red-heart'], ['cuore', 'red-heart'], ['innamorato', 'red-heart'],
  // NL
  ['liefde', 'red-heart'], ['hart', 'red-heart'],
  // RU
  ['lyubov', 'red-heart'], ['serdce', 'red-heart'],
  // AR
  ['hob', 'red-heart'], ['albi', 'red-heart'], ['habibi', 'red-heart'],
  // TR
  ['ask', 'red-heart'], ['sevgi', 'red-heart'], ['kalp', 'red-heart'], ['seviyorum', 'red-heart'],
  // JA
  ['daisuki', 'red-heart'], ['suki', 'red-heart'],
  // KO
  ['sarang', 'red-heart'],
  // ZH
  ['xin', 'red-heart'],
  // HI
  ['pyaar', 'red-heart'], ['mohabbat', 'red-heart'], ['dil', 'red-heart'],
  // ID
  ['cinta', 'red-heart'], ['sayang', 'red-heart'],

  // ── ✨ SPARKLING-HEART — beauty, cute, aesthetic, wonderful ──────────────
  // EN
  ['beautiful', 'sparkling-heart'], ['gorgeous', 'sparkling-heart'], ['stunning', 'sparkling-heart'],
  ['cute', 'sparkling-heart'], ['adorable', 'sparkling-heart'], ['lovely', 'sparkling-heart'],
  ['sweet', 'sparkling-heart'], ['pretty', 'sparkling-heart'], ['aesthetic', 'sparkling-heart'],
  // FR
  ['magnifique', 'sparkling-heart'], ['beau', 'sparkling-heart'], ['belle', 'sparkling-heart'],
  ['mignon', 'sparkling-heart'], ['sublime', 'sparkling-heart'],
  // ES
  ['hermoso', 'sparkling-heart'], ['hermosa', 'sparkling-heart'], ['precioso', 'sparkling-heart'],
  ['guapo', 'sparkling-heart'], ['bonito', 'sparkling-heart'], ['lindo', 'sparkling-heart'],
  // PT
  ['lindo', 'sparkling-heart'], ['gato', 'sparkling-heart'],
  // DE
  ['schon', 'sparkling-heart'], ['hubsch', 'sparkling-heart'], ['wunderschon', 'sparkling-heart'],
  // IT
  ['bellissimo', 'sparkling-heart'], ['carino', 'sparkling-heart'],
  // AR
  ['jamil', 'sparkling-heart'], ['helwa', 'sparkling-heart'],
  // TR
  ['guzel', 'sparkling-heart'], ['tatli', 'sparkling-heart'],
  // JA
  ['kawaii', 'sparkling-heart'], ['kirei', 'sparkling-heart'],
  // KO
  ['yeppeuda', 'sparkling-heart'], ['gwiyeowo', 'sparkling-heart'],

  // ── 😂 JOY / 🤣 ROFL — humor, laugh, funny ──────────────────────────────
  // EN
  ['funny', 'joy'], ['hilarious', 'rofl'], ['lmao', 'rofl'], ['lol', 'rofl'],
  ['haha', 'rofl'], ['dying', 'rofl'], ['dead', 'rofl'], ['humor', 'joy'],
  ['joke', 'joy'], ['comedy', 'joy'], ['laughing', 'joy'], ['laugh', 'joy'],
  ['giggle', 'joy'], ['cringe', 'joy'],
  // FR
  ['drole', 'joy'], ['rire', 'joy'], ['marrant', 'joy'], ['comique', 'joy'],
  ['mdr', 'rofl'], ['ptdr', 'rofl'], ['xd', 'rofl'], ['hilarant', 'rofl'],
  ['rigolo', 'joy'], ['humour', 'joy'], ['blague', 'joy'],
  // ES
  ['gracioso', 'joy'], ['jajaja', 'rofl'], ['jaja', 'rofl'],
  ['chistoso', 'joy'], ['divertido', 'joy'], ['comico', 'joy'],
  // PT
  ['engraçado', 'joy'], ['piada', 'joy'], ['kkk', 'rofl'],
  // DE
  ['lustig', 'joy'], ['witzig', 'joy'], ['lachen', 'joy'],
  // IT
  ['ridere', 'joy'], ['divertente', 'joy'], ['ahah', 'rofl'],
  // AR
  ['dahik', 'joy'], ['mudhi', 'joy'],
  // TR
  ['komik', 'joy'], ['guluyorum', 'rofl'],
  // JA
  ['warau', 'joy'], ['ukeru', 'rofl'], ['wara', 'rofl'],
  // KO
  ['keke', 'rofl'],
  // ID
  ['lucu', 'joy'], ['ketawa', 'joy'],

  // ── 🎉 PARTY-POPPER — win, success, celebration, achievement ──────────────
  // EN
  ['win', 'party-popper'], ['won', 'party-popper'], ['winner', 'party-popper'],
  ['victory', 'party-popper'], ['champion', 'party-popper'], ['congratulations', 'party-popper'],
  ['congrats', 'party-popper'], ['celebrate', 'party-popper'], ['celebration', 'party-popper'],
  ['achievement', 'party-popper'], ['milestone', 'party-popper'], ['success', 'party-popper'],
  ['party', 'party-popper'],
  // FR
  ['gagne', 'party-popper'], ['victoire', 'party-popper'], ['felicitations', 'party-popper'],
  ['bravo', 'party-popper'], ['succes', 'party-popper'], ['fete', 'party-popper'],
  ['reussi', 'party-popper'], ['accompli', 'party-popper'],
  // ES
  ['ganar', 'party-popper'], ['campeon', 'party-popper'], ['felicidades', 'party-popper'],
  ['enhorabuena', 'party-popper'], ['exito', 'party-popper'], ['fiesta', 'party-popper'],
  // PT
  ['ganhou', 'party-popper'], ['parabens', 'party-popper'], ['sucesso', 'party-popper'],
  ['vencedor', 'party-popper'], ['festa', 'party-popper'],
  // DE
  ['gewonnen', 'party-popper'], ['gluckwunsch', 'party-popper'], ['erfolg', 'party-popper'],
  ['sieg', 'party-popper'], ['feier', 'party-popper'],
  // IT
  ['vinto', 'party-popper'], ['complimenti', 'party-popper'], ['successo', 'party-popper'],
  ['campione', 'party-popper'], ['festeggiare', 'party-popper'],
  // NL
  ['gefeliciteerd', 'party-popper'],
  // RU
  ['pobeda', 'party-popper'], ['pozdravlyayu', 'party-popper'], ['prazdnik', 'party-popper'],
  // AR
  ['mabrouk', 'party-popper'], ['faoz', 'party-popper'],
  // TR
  ['kazandi', 'party-popper'], ['tebrikler', 'party-popper'], ['kutlama', 'party-popper'],
  // JA
  ['yatta', 'party-popper'], ['omedeto', 'party-popper'],
  // KO
  ['chukahaeyo', 'party-popper'], ['seungni', 'party-popper'],
  // ZH
  ['zhuhe', 'party-popper'], ['yinle', 'party-popper'],
  // HI
  ['badhai', 'party-popper'], ['jeet', 'party-popper'],
  // ID
  ['menang', 'party-popper'],

  // ── 🎂 BIRTHDAY-CAKE — birthday, anniversary ──────────────────────────────
  // EN
  ['birthday', 'birthday-cake'], ['anniversary', 'birthday-cake'],
  // FR
  ['anniversaire', 'birthday-cake'], ['anniv', 'birthday-cake'],
  // ES
  ['cumpleanos', 'birthday-cake'],
  // PT
  ['aniversario', 'birthday-cake'],
  // DE
  ['geburtstag', 'birthday-cake'],
  // IT
  ['compleanno', 'birthday-cake'],
  // NL
  ['verjaardag', 'birthday-cake'],
  // TR
  ['dogumgunu', 'birthday-cake'],
  // ZH
  ['shengri', 'birthday-cake'],
  // ID
  ['ultah', 'birthday-cake'],

  // ── 😭 LOUDLY-CRYING — sadness, grief, emotional, heartbreak ──────────────
  // EN
  ['sad', 'loudly-crying'], ['crying', 'loudly-crying'], ['heartbroken', 'loudly-crying'],
  ['devastated', 'loudly-crying'], ['depressed', 'loudly-crying'], ['hurt', 'loudly-crying'],
  ['pain', 'loudly-crying'], ['grief', 'loudly-crying'], ['miss', 'loudly-crying'],
  ['loss', 'loudly-crying'], ['emotional', 'loudly-crying'], ['tears', 'loudly-crying'],
  ['cry', 'loudly-crying'], ['suffering', 'loudly-crying'],
  // FR
  ['triste', 'loudly-crying'], ['pleure', 'loudly-crying'], ['larmes', 'loudly-crying'],
  ['douleur', 'loudly-crying'], ['chagrin', 'loudly-crying'], ['peine', 'loudly-crying'],
  ['manque', 'loudly-crying'],
  // ES
  ['llorando', 'loudly-crying'], ['lagrimas', 'loudly-crying'], ['dolor', 'loudly-crying'],
  ['triste', 'loudly-crying'],
  // PT
  ['chorando', 'loudly-crying'], ['saudade', 'loudly-crying'], ['sofrendo', 'loudly-crying'],
  ['dor', 'loudly-crying'],
  // DE
  ['traurig', 'loudly-crying'], ['weinen', 'loudly-crying'], ['schmerz', 'loudly-crying'],
  ['vermisse', 'loudly-crying'],
  // IT
  ['piangendo', 'loudly-crying'], ['dolore', 'loudly-crying'],
  // AR
  ['hazin', 'loudly-crying'], ['alam', 'loudly-crying'],
  // TR
  ['uzgun', 'loudly-crying'], ['agliyor', 'loudly-crying'],
  // JA
  ['kanashii', 'loudly-crying'], ['naiteiru', 'loudly-crying'], ['sabishii', 'loudly-crying'],
  // KO
  ['seulpeo', 'loudly-crying'], ['ulgo', 'loudly-crying'],
  // ZH
  ['shangxin', 'loudly-crying'],
  // ID
  ['sedih', 'loudly-crying'], ['nangis', 'loudly-crying'], ['menangis', 'loudly-crying'],

  // ── 💸 MONEY-WITH-WINGS — wealth, money, financial, rich ──────────────────
  // EN
  ['money', 'money-with-wings'], ['cash', 'money-with-wings'], ['rich', 'money-with-wings'],
  ['dollar', 'money-with-wings'], ['profit', 'money-with-wings'], ['income', 'money-with-wings'],
  ['earn', 'money-with-wings'], ['earning', 'money-with-wings'], ['salary', 'money-with-wings'],
  ['wealth', 'money-with-wings'], ['investment', 'money-with-wings'],
  ['millionaire', 'money-with-wings'], ['billionaire', 'money-with-wings'],
  ['paid', 'money-with-wings'], ['revenue', 'money-with-wings'], ['bitcoin', 'money-with-wings'],
  ['crypto', 'money-with-wings'], ['euros', 'money-with-wings'], ['pounds', 'money-with-wings'],
  // FR
  ['argent', 'money-with-wings'], ['riche', 'money-with-wings'], ['fric', 'money-with-wings'],
  ['thunes', 'money-with-wings'], ['ble', 'money-with-wings'], ['salaire', 'money-with-wings'],
  ['revenu', 'money-with-wings'], ['fortune', 'money-with-wings'], ['million', 'money-with-wings'],
  ['milliardaire', 'money-with-wings'], ['paye', 'money-with-wings'],
  // ES
  ['dinero', 'money-with-wings'], ['plata', 'money-with-wings'], ['rico', 'money-with-wings'],
  ['lana', 'money-with-wings'], ['ganancias', 'money-with-wings'], ['millonario', 'money-with-wings'],
  // PT
  ['dinheiro', 'money-with-wings'], ['lucro', 'money-with-wings'], ['grana', 'money-with-wings'],
  ['milionario', 'money-with-wings'],
  // DE
  ['geld', 'money-with-wings'], ['reich', 'money-with-wings'], ['verdienen', 'money-with-wings'],
  ['gehalt', 'money-with-wings'], ['millionar', 'money-with-wings'],
  // IT
  ['soldi', 'money-with-wings'], ['denaro', 'money-with-wings'], ['ricco', 'money-with-wings'],
  ['guadagno', 'money-with-wings'],
  // AR
  ['flous', 'money-with-wings'], ['maal', 'money-with-wings'],
  // TR
  ['para', 'money-with-wings'], ['zengin', 'money-with-wings'], ['kazan', 'money-with-wings'],
  // JA
  ['okane', 'money-with-wings'], ['kanemochi', 'money-with-wings'],
  // KO
  ['don', 'money-with-wings'], ['buja', 'money-with-wings'],
  // ZH
  ['qian', 'money-with-wings'], ['fuhao', 'money-with-wings'],
  // HI
  ['paisa', 'money-with-wings'], ['ameer', 'money-with-wings'],
  // ID
  ['uang', 'money-with-wings'], ['kaya', 'money-with-wings'], ['duit', 'money-with-wings'],

  // ── 👍 THUMBS-UP — approval, perfect, good, yes ──────────────────────────
  // EN
  ['perfect', 'thumbs-up'], ['good', 'thumbs-up'], ['great', 'thumbs-up'],
  ['excellent', 'thumbs-up'], ['awesome', 'thumbs-up'], ['brilliant', 'thumbs-up'],
  ['outstanding', 'thumbs-up'], ['yes', 'thumbs-up'], ['absolutely', 'thumbs-up'],
  ['definitely', 'thumbs-up'], ['exactly', 'thumbs-up'], ['right', 'thumbs-up'],
  ['correct', 'thumbs-up'], ['agreed', 'thumbs-up'], ['approve', 'thumbs-up'],
  // FR
  ['parfait', 'thumbs-up'], ['bien', 'thumbs-up'], ['super', 'thumbs-up'],
  ['genial', 'thumbs-up'], ['oui', 'thumbs-up'], ['exactement', 'thumbs-up'],
  ['absolument', 'thumbs-up'], ['vrai', 'thumbs-up'], ['valide', 'thumbs-up'],
  // ES
  ['perfecto', 'thumbs-up'], ['excelente', 'thumbs-up'], ['bueno', 'thumbs-up'],
  ['exacto', 'thumbs-up'], ['correcto', 'thumbs-up'], ['claro', 'thumbs-up'],
  // PT
  ['perfeito', 'thumbs-up'], ['otimo', 'thumbs-up'], ['bom', 'thumbs-up'],
  ['exato', 'thumbs-up'],
  // DE
  ['perfekt', 'thumbs-up'], ['gut', 'thumbs-up'], ['ausgezeichnet', 'thumbs-up'],
  ['ja', 'thumbs-up'], ['genau', 'thumbs-up'], ['richtig', 'thumbs-up'],
  // IT
  ['perfetto', 'thumbs-up'], ['bene', 'thumbs-up'], ['eccellente', 'thumbs-up'],
  // AR
  ['tamam', 'thumbs-up'], ['aywa', 'thumbs-up'], ['zain', 'thumbs-up'],
  // TR
  ['iyi', 'thumbs-up'], ['evet', 'thumbs-up'], ['harika', 'thumbs-up'],
  // JA
  ['subarashii', 'thumbs-up'], ['hai', 'thumbs-up'], ['yoshi', 'thumbs-up'],
  // KO
  ['joayo', 'thumbs-up'], ['ne', 'thumbs-up'],
  // ZH
  ['hao', 'thumbs-up'], ['shi', 'thumbs-up'],
  // HI
  ['achcha', 'thumbs-up'], ['bilkul', 'thumbs-up'], ['haan', 'thumbs-up'],
  // ID
  ['bagus', 'thumbs-up'], ['benar', 'thumbs-up'], ['iya', 'thumbs-up'],

  // ── 👏 CLAP — applause, bravo, respect, admire ────────────────────────────
  // EN
  ['applause', 'clap'], ['clap', 'clap'], ['respect', 'clap'],
  ['impressive', 'clap'], ['welldone', 'clap'],
  // FR
  ['chapeau', 'clap'], ['applaudissements', 'clap'], ['admirable', 'clap'],
  // ES
  ['aplausos', 'clap'],
  // PT
  ['palmas', 'clap'],
  // DE
  ['applaus', 'clap'], ['respekt', 'clap'],
  // IT
  ['applausi', 'clap'],
  // AR
  ['barakalak', 'clap'], ['mashaallah', 'clap'],
  // TR
  ['alkis', 'clap'], ['aferin', 'clap'],

  // ── 💯 100 — facts, truth, no cap, accurate, real talk ───────────────────
  // EN
  ['facts', '100'], ['nocap', '100'], ['real', '100'], ['truth', '100'],
  ['accurate', '100'], ['deadass', '100'], ['periodt', '100'],
  // FR
  ['factuel', '100'], ['verite', '100'], ['reel', '100'], ['serieusement', '100'],
  // ES
  ['verdad', '100'], ['hechos', '100'],
  // PT
  ['verdade', '100'], ['fato', '100'],
  // AR
  ['sahih', '100'], ['haq', '100'],

  // ── 👀 EYES — attention, watch, notice, look, reveal ─────────────────────
  // EN
  ['look', 'eyes'], ['see', 'eyes'], ['watch', 'eyes'], ['notice', 'eyes'],
  ['stare', 'eyes'], ['reveal', 'eyes'], ['exposed', 'eyes'], ['caught', 'eyes'],
  ['showing', 'eyes'], ['attention', 'eyes'], ['check', 'eyes'],
  // FR
  ['regarder', 'eyes'], ['voir', 'eyes'], ['observer', 'eyes'], ['reveler', 'eyes'],
  ['exposer', 'eyes'],
  // ES
  ['mirar', 'eyes'], ['ver', 'eyes'], ['atencion', 'eyes'],
  // PT
  ['olhar', 'eyes'], ['atencao', 'eyes'],
  // DE
  ['schauen', 'eyes'], ['sehen', 'eyes'], ['gucken', 'eyes'], ['achtung', 'eyes'],
  // IT
  ['guardare', 'eyes'], ['vedere', 'eyes'], ['attenzione', 'eyes'],
  // JA
  ['miru', 'eyes'], ['chui', 'eyes'],
  // KO
  ['bwa', 'eyes'], ['jusimok', 'eyes'],

  // ── 💪 MUSCLE — strength, power, workout, hustle, grind ──────────────────
  // EN
  ['strong', 'muscle'], ['strength', 'muscle'], ['powerful', 'muscle'], ['power', 'muscle'],
  ['muscle', 'muscle'], ['workout', 'muscle'], ['gym', 'muscle'], ['hustle', 'muscle'],
  ['grind', 'muscle'], ['effort', 'muscle'], ['discipline', 'muscle'],
  ['motivated', 'muscle'], ['motivation', 'muscle'], ['push', 'muscle'], ['fight', 'muscle'],
  // FR
  ['fort', 'muscle'], ['force', 'muscle'], ['puissant', 'muscle'], ['entrainement', 'muscle'],
  ['bosser', 'muscle'], ['travailler', 'muscle'], ['boulot', 'muscle'],
  // ES
  ['fuerte', 'muscle'], ['fuerza', 'muscle'], ['poderoso', 'muscle'],
  ['entrenamiento', 'muscle'], ['esfuerzo', 'muscle'], ['motivacion', 'muscle'],
  // PT
  ['forte', 'muscle'], ['forca', 'muscle'], ['treino', 'muscle'], ['esforco', 'muscle'],
  // DE
  ['stark', 'muscle'], ['kraft', 'muscle'], ['training', 'muscle'],
  // IT
  ['forza', 'muscle'], ['allenamento', 'muscle'], ['motivazione', 'muscle'],
  // AR
  ['qawi', 'muscle'], ['quwwa', 'muscle'],
  // TR
  ['guclu', 'muscle'], ['guc', 'muscle'], ['antrenman', 'muscle'],
  // JA
  ['tsuyoi', 'muscle'], ['chikara', 'muscle'],
  // KO
  ['ganghan', 'muscle'], ['him', 'muscle'],
  // ID
  ['kuat', 'muscle'], ['semangat', 'muscle'],

  // ── ✨ SPARKLES — magic, aesthetics, extraordinary, shine ─────────────────
  // EN
  ['magic', 'sparkles'], ['magical', 'sparkles'], ['glowing', 'sparkles'],
  ['shining', 'sparkles'], ['glow', 'sparkles'], ['shine', 'sparkles'],
  ['special', 'sparkles'], ['wonderful', 'sparkles'], ['marvelous', 'sparkles'],
  ['extraordinary', 'sparkles'],
  // FR
  ['magie', 'sparkles'], ['magique', 'sparkles'], ['merveilleux', 'sparkles'],
  ['extraordinaire', 'sparkles'], ['eblouissant', 'sparkles'], ['brillant', 'sparkles'],
  ['exceptionnel', 'sparkles'],
  // ES
  ['magico', 'sparkles'], ['maravilloso', 'sparkles'], ['extraordinario', 'sparkles'],
  // PT
  ['magico', 'sparkles'], ['maravilhoso', 'sparkles'], ['brilhante', 'sparkles'],
  // DE
  ['magisch', 'sparkles'], ['wunderbar', 'sparkles'], ['glanzend', 'sparkles'],
  // IT
  ['meraviglioso', 'sparkles'], ['straordinario', 'sparkles'],
  // JA
  ['mahouteki', 'sparkles'], ['kagayaki', 'sparkles'],

  // ── 🚀 ROCKET — fast, growth, launch, viral, trending up ─────────────────
  // EN
  ['rocket', 'rocket'], ['launch', 'rocket'], ['scale', 'rocket'], ['skyrocket', 'rocket'],
  ['trending', 'rocket'], ['growing', 'rocket'], ['growth', 'rocket'],
  ['viral', 'rocket'], ['fast', 'rocket'], ['rapidly', 'rocket'],
  // FR
  ['lancer', 'rocket'], ['croissance', 'rocket'], ['exploser', 'rocket'],
  ['tendance', 'rocket'], ['rapide', 'rocket'], ['monter', 'rocket'], ['decollage', 'rocket'],
  // ES
  ['lanzar', 'rocket'], ['crecer', 'rocket'], ['rapido', 'rocket'], ['tendencia', 'rocket'],
  // PT
  ['lancar', 'rocket'], ['crescimento', 'rocket'],
  // DE
  ['starten', 'rocket'], ['wachstum', 'rocket'], ['schnell', 'rocket'],
  // IT
  ['lanciare', 'rocket'], ['crescita', 'rocket'], ['veloce', 'rocket'],
  // JA
  ['hasshin', 'rocket'], ['seicho', 'rocket'],
  // KO
  ['bairol', 'rocket'], ['seongjanghada', 'rocket'],

  // ── 💡 LIGHT-BULB — idea, tip, hack, insight, secret ─────────────────────
  // EN
  ['idea', 'light-bulb'], ['tip', 'light-bulb'], ['trick', 'light-bulb'],
  ['hack', 'light-bulb'], ['insight', 'light-bulb'], ['discover', 'light-bulb'],
  ['discovery', 'light-bulb'], ['secret', 'light-bulb'], ['hidden', 'light-bulb'],
  ['revealed', 'light-bulb'],
  // FR
  ['idee', 'light-bulb'], ['astuce', 'light-bulb'], ['conseil', 'light-bulb'],
  ['truc', 'light-bulb'], ['decouverte', 'light-bulb'], ['realiser', 'light-bulb'],
  // ES
  ['truco', 'light-bulb'], ['consejo', 'light-bulb'], ['secreto', 'light-bulb'],
  ['descubrimiento', 'light-bulb'],
  // PT
  ['dica', 'light-bulb'], ['truque', 'light-bulb'], ['segredo', 'light-bulb'],
  ['descoberta', 'light-bulb'],
  // DE
  ['tipp', 'light-bulb'], ['geheimnis', 'light-bulb'], ['erkenntnis', 'light-bulb'],
  // IT
  ['trucco', 'light-bulb'], ['segreto', 'light-bulb'], ['scoperta', 'light-bulb'],
  // AR
  ['fekra', 'light-bulb'], ['sirr', 'light-bulb'],
  // TR
  ['fikir', 'light-bulb'], ['ipucu', 'light-bulb'],
  // JA
  ['hinto', 'light-bulb'], ['himitsu', 'light-bulb'],
  // KO
  ['aidio', 'light-bulb'], ['bimil', 'light-bulb'],

  // ── 😎 SUNGLASSES-FACE — cool, swag, confident, boss, chill ──────────────
  // EN
  ['cool', 'sunglasses-face'], ['swag', 'sunglasses-face'], ['boss', 'sunglasses-face'],
  ['smooth', 'sunglasses-face'], ['confident', 'sunglasses-face'], ['slick', 'sunglasses-face'],
  ['slay', 'sunglasses-face'], ['fresh', 'sunglasses-face'], ['flex', 'sunglasses-face'],
  // FR
  ['style', 'sunglasses-face'], ['classe', 'sunglasses-face'], ['chic', 'sunglasses-face'],
  ['chill', 'sunglasses-face'], ['patron', 'sunglasses-face'],
  // ES
  ['chulo', 'sunglasses-face'], ['guay', 'sunglasses-face'], ['tranquilo', 'sunglasses-face'],
  ['jefe', 'sunglasses-face'],
  // PT
  ['estiloso', 'sunglasses-face'], ['massa', 'sunglasses-face'],
  // DE
  ['lassig', 'sunglasses-face'], ['chef', 'sunglasses-face'],
  // IT
  ['ganzo', 'sunglasses-face'], ['fico', 'sunglasses-face'],
  // TR
  ['havali', 'sunglasses-face'],
  // JA
  ['kakkoii', 'sunglasses-face'], ['oshare', 'sunglasses-face'],
  // KO
  ['meosjida', 'sunglasses-face'],

  // ── 🙏 FOLDED-HANDS — gratitude, pray, please, thanks, blessed ───────────
  // EN
  ['thanks', 'folded-hands'], ['thank', 'folded-hands'], ['grateful', 'folded-hands'],
  ['gratitude', 'folded-hands'], ['blessed', 'folded-hands'], ['please', 'folded-hands'],
  ['pray', 'folded-hands'], ['prayer', 'folded-hands'],
  // FR
  ['merci', 'folded-hands'], ['remercie', 'folded-hands'], ['reconnaissant', 'folded-hands'],
  ['prier', 'folded-hands'], ['beni', 'folded-hands'],
  // ES
  ['gracias', 'folded-hands'], ['agradecido', 'folded-hands'], ['rezar', 'folded-hands'],
  // PT
  ['obrigado', 'folded-hands'], ['abencado', 'folded-hands'],
  // DE
  ['danke', 'folded-hands'], ['dankbar', 'folded-hands'], ['gesegnet', 'folded-hands'],
  // IT
  ['grazie', 'folded-hands'], ['grato', 'folded-hands'], ['pregare', 'folded-hands'],
  // AR
  ['shukran', 'folded-hands'], ['hamdulillah', 'folded-hands'],
  // TR
  ['tesekkur', 'folded-hands'], ['dua', 'folded-hands'],
  // JA
  ['arigatou', 'folded-hands'], ['inoru', 'folded-hands'],
  // KO
  ['gomawo', 'folded-hands'], ['gamsahada', 'folded-hands'],
  // ZH
  ['xiexie', 'folded-hands'], ['ganxie', 'folded-hands'],
  // HI
  ['shukriya', 'folded-hands'], ['dhanyavad', 'folded-hands'],
  // ID
  ['makasih', 'folded-hands'],

  // ── 😡 ANGRY — frustration, anger, rage, unfair, hate ────────────────────
  // EN
  ['angry', 'angry'], ['anger', 'angry'], ['furious', 'angry'], ['mad', 'angry'],
  ['rage', 'angry'], ['frustrated', 'angry'], ['unfair', 'angry'],
  ['disgusting', 'angry'], ['hate', 'angry'],
  // FR
  ['colere', 'angry'], ['enerve', 'angry'], ['frustre', 'angry'], ['injuste', 'angry'],
  ['degout', 'angry'], ['hair', 'angry'],
  // ES
  ['enojado', 'angry'], ['rabia', 'angry'], ['injusto', 'angry'], ['odio', 'angry'],
  // PT
  ['raiva', 'angry'],
  // DE
  ['wutend', 'angry'], ['arger', 'angry'], ['ungerecht', 'angry'], ['hass', 'angry'],
  // IT
  ['arrabbiato', 'angry'], ['rabbia', 'angry'], ['ingiusto', 'angry'],
  // AR
  ['ghazab', 'angry'], ['zaalan', 'angry'],
  // TR
  ['sinirli', 'angry'], ['ofke', 'angry'],
  // JA
  ['okotteru', 'angry'], ['ikari', 'angry'], ['mukatsuku', 'angry'],
  // KO
  ['hwa', 'angry'], ['bunhada', 'angry'],

  // ── 😱 SCREAMING — fear, horror, terror, extreme shock ───────────────────
  // EN
  ['scary', 'screaming'], ['terrifying', 'screaming'], ['horror', 'screaming'],
  ['fear', 'screaming'], ['nightmare', 'screaming'], ['terrified', 'screaming'],
  ['creepy', 'screaming'], ['spooky', 'screaming'],
  // FR
  ['peur', 'screaming'], ['effrayant', 'screaming'], ['horrible', 'screaming'],
  ['cauchemar', 'screaming'], ['terrifiant', 'screaming'],
  // ES
  ['miedo', 'screaming'], ['aterrador', 'screaming'], ['pesadilla', 'screaming'],
  // PT
  ['medo', 'screaming'], ['assustador', 'screaming'], ['pesadelo', 'screaming'],
  // DE
  ['angst', 'screaming'], ['schrecklich', 'screaming'],
  // IT
  ['paura', 'screaming'], ['terrificante', 'screaming'], ['orrore', 'screaming'],
  // JA
  ['kowai', 'screaming'], ['kyofu', 'screaming'],
  // KO
  ['museopda', 'screaming'],

  // ── ⭐ GLOWING-STAR — excellence, top, best, legend, GOAT ────────────────
  // EN
  ['star', 'glowing-star'], ['stars', 'glowing-star'], ['award', 'glowing-star'],
  ['trophy', 'glowing-star'], ['best', 'glowing-star'], ['top', 'glowing-star'],
  ['goat', 'glowing-star'], ['legend', 'glowing-star'], ['iconic', 'glowing-star'],
  ['legendary', 'glowing-star'],
  // FR
  ['etoile', 'glowing-star'], ['trophee', 'glowing-star'], ['legende', 'glowing-star'],
  ['meilleur', 'glowing-star'], ['iconique', 'glowing-star'], ['excellence', 'glowing-star'],
  // ES
  ['estrella', 'glowing-star'], ['trofeo', 'glowing-star'], ['leyenda', 'glowing-star'],
  ['mejor', 'glowing-star'],
  // PT
  ['estrela', 'glowing-star'], ['lenda', 'glowing-star'], ['melhor', 'glowing-star'],
  // DE
  ['stern', 'glowing-star'], ['legende', 'glowing-star'], ['bester', 'glowing-star'],
  // IT
  ['stella', 'glowing-star'], ['leggenda', 'glowing-star'], ['migliore', 'glowing-star'],
  // AR
  ['najm', 'glowing-star'],
  // TR
  ['yildiz', 'glowing-star'], ['efsane', 'glowing-star'],
  // JA
  ['hoshi', 'glowing-star'], ['densetsu', 'glowing-star'], ['saikyo', 'glowing-star'],
  // KO
  ['byeol', 'glowing-star'], ['jeonseol', 'glowing-star'],

  // ── 🤔 THINKING — reflection, doubt, question, hmm ───────────────────────
  // EN
  ['think', 'thinking-face'], ['thinking', 'thinking-face'], ['wonder', 'thinking-face'],
  ['doubt', 'thinking-face'], ['question', 'thinking-face'], ['hmm', 'thinking-face'],
  ['maybe', 'thinking-face'], ['considering', 'thinking-face'], ['analyze', 'thinking-face'],
  // FR
  ['penser', 'thinking-face'], ['reflechir', 'thinking-face'], ['doute', 'thinking-face'],
  ['analyser', 'thinking-face'],
  // ES
  ['pensar', 'thinking-face'], ['duda', 'thinking-face'], ['analizar', 'thinking-face'],
  // DE
  ['denken', 'thinking-face'], ['uberlegen', 'thinking-face'], ['zweifel', 'thinking-face'],
  // IT
  ['pensare', 'thinking-face'], ['dubbio', 'thinking-face'],
  // JA
  ['kangaeru', 'thinking-face'],
  // KO
  ['saenggak', 'thinking-face'],

  // ── 🎓 GRADUATION-CAP — learning, education, knowledge ───────────────────
  // EN
  ['learn', 'graduation-cap'], ['learning', 'graduation-cap'], ['study', 'graduation-cap'],
  ['school', 'graduation-cap'], ['education', 'graduation-cap'], ['knowledge', 'graduation-cap'],
  ['course', 'graduation-cap'], ['tutorial', 'graduation-cap'], ['lesson', 'graduation-cap'],
  ['teach', 'graduation-cap'], ['master', 'graduation-cap'],
  // FR
  ['apprendre', 'graduation-cap'], ['etudier', 'graduation-cap'], ['formation', 'graduation-cap'],
  ['cours', 'graduation-cap'], ['connaissance', 'graduation-cap'], ['tutoriel', 'graduation-cap'],
  // ES
  ['aprender', 'graduation-cap'], ['estudiar', 'graduation-cap'], ['educacion', 'graduation-cap'],
  ['conocimiento', 'graduation-cap'],
  // PT
  ['aprender', 'graduation-cap'], ['estudar', 'graduation-cap'], ['educacao', 'graduation-cap'],
  // DE
  ['lernen', 'graduation-cap'], ['ausbildung', 'graduation-cap'], ['kurs', 'graduation-cap'],
  // IT
  ['imparare', 'graduation-cap'], ['studiare', 'graduation-cap'],
  // JA
  ['manabu', 'graduation-cap'], ['benkyo', 'graduation-cap'],
  // KO
  ['baeuda', 'graduation-cap'], ['gongbuhada', 'graduation-cap'],

  // ── 🎵 MUSICAL-NOTES — music, song, rhythm, beat, sound ──────────────────
  // EN
  ['music', 'musical-notes'], ['song', 'musical-notes'], ['beat', 'musical-notes'],
  ['rhythm', 'musical-notes'], ['melody', 'musical-notes'], ['track', 'musical-notes'],
  ['sound', 'musical-notes'], ['audio', 'musical-notes'],
  // FR
  ['musique', 'musical-notes'], ['chanson', 'musical-notes'], ['melodie', 'musical-notes'],
  ['rythme', 'musical-notes'], ['morceau', 'musical-notes'],
  // ES
  ['musica', 'musical-notes'], ['cancion', 'musical-notes'], ['ritmo', 'musical-notes'],
  // PT
  ['cancao', 'musical-notes'],
  // DE
  ['musik', 'musical-notes'], ['lied', 'musical-notes'],
  // IT
  ['canzone', 'musical-notes'],
  // AR
  ['musiqa', 'musical-notes'], ['ughniya', 'musical-notes'],
  // TR
  ['muzik', 'musical-notes'], ['sarki', 'musical-notes'],
  // JA
  ['ongaku', 'musical-notes'], ['kyoku', 'musical-notes'],
  // KO
  ['eumak', 'musical-notes'], ['norae', 'musical-notes'],

  // ── 🌟 STAR-STRUCK — wow, celebrity, blown away, amazed ──────────────────
  // EN
  ['wow', 'star-struck'], ['woah', 'star-struck'], ['whoa', 'star-struck'],
  ['celebrity', 'star-struck'], ['famous', 'star-struck'], ['superstar', 'star-struck'],
  // FR
  ['waouh', 'star-struck'], ['celebrite', 'star-struck'], ['fameux', 'star-struck'],
  // ES
  ['guau', 'star-struck'], ['famoso', 'star-struck'],
  // PT
  ['uau', 'star-struck'],
  // DE
  ['beruhmtheit', 'star-struck'],
  // IT
  ['famoso', 'star-struck'],
  // AR
  ['waow', 'star-struck'],
  // TR
  ['vay', 'star-struck'], ['meshur', 'star-struck'],
  // JA
  ['waa', 'star-struck'], ['yuumei', 'star-struck'],
  // KO
  ['wau', 'star-struck'],

  // ── 👋 WAVE — greeting, hello, goodbye, welcome ───────────────────────────
  // EN
  ['hello', 'wave'], ['hi', 'wave'], ['hey', 'wave'], ['bye', 'wave'],
  ['goodbye', 'wave'], ['welcome', 'wave'], ['greetings', 'wave'],
  // FR
  ['bonjour', 'wave'], ['salut', 'wave'], ['coucou', 'wave'], ['aurevoir', 'wave'],
  ['bienvenue', 'wave'], ['bonsoir', 'wave'],
  // ES
  ['hola', 'wave'], ['adios', 'wave'], ['bienvenido', 'wave'],
  // PT
  ['oi', 'wave'], ['tchau', 'wave'], ['benvindo', 'wave'],
  // DE
  ['hallo', 'wave'], ['tschuss', 'wave'], ['willkommen', 'wave'], ['moin', 'wave'],
  // IT
  ['ciao', 'wave'], ['arrivederci', 'wave'], ['benvenuto', 'wave'],
  // AR
  ['marhaba', 'wave'], ['ahlan', 'wave'],
  // TR
  ['merhaba', 'wave'], ['hosgeldin', 'wave'],
  // JA
  ['konnichiwa', 'wave'], ['sayonara', 'wave'], ['ohayo', 'wave'],
  // KO
  ['annyeong', 'wave'], ['anyeonghaseyo', 'wave'],
  // ZH
  ['nihao', 'wave'], ['zaijian', 'wave'],
  // HI
  ['namaste', 'wave'], ['namaskar', 'wave'],
  // ID
  ['halo', 'wave'], ['dadah', 'wave'],

  // ── 🧠 NERD-FACE — smart, genius, strategy, brain ────────────────────────
  // EN
  ['genius', 'nerd-face'], ['smart', 'nerd-face'], ['intelligent', 'nerd-face'],
  ['strategy', 'nerd-face'], ['logical', 'nerd-face'], ['analysis', 'nerd-face'],
  ['brain', 'nerd-face'], ['calculated', 'nerd-face'],
  // FR
  ['genie', 'nerd-face'], ['strategie', 'nerd-face'], ['cerveau', 'nerd-face'],
  // ES
  ['inteligente', 'nerd-face'], ['genio', 'nerd-face'], ['estrategia', 'nerd-face'],
  // PT
  ['inteligente', 'nerd-face'], ['estrategia', 'nerd-face'],
  // DE
  ['klug', 'nerd-face'], ['gehirn', 'nerd-face'],
  // IT
  ['intelligente', 'nerd-face'], ['strategia', 'nerd-face'],
  // JA
  ['tensai', 'nerd-face'], ['sakusen', 'nerd-face'],
  // KO
  ['cheongjae', 'nerd-face'], ['jeonryak', 'nerd-face'],

  // ── 😴 SLEEP/SLEEPY — tired, bored, exhausted, rest ─────────────────────
  // EN
  ['sleep', 'sleep'], ['tired', 'sleepy'], ['exhausted', 'sleep'], ['bored', 'sleep'],
  ['rest', 'sleep'], ['nap', 'sleep'], ['yawn', 'sleep'],
  // FR
  ['dormir', 'sleep'], ['fatigue', 'sleepy'], ['epuise', 'sleep'],
  ['ennui', 'sleep'], ['sieste', 'sleep'],
  // ES
  ['dormir', 'sleep'], ['cansado', 'sleepy'], ['agotado', 'sleep'], ['aburrido', 'sleep'],
  // PT
  ['esgotado', 'sleep'], ['entediado', 'sleep'],
  // DE
  ['schlafen', 'sleep'], ['mude', 'sleepy'], ['erschopft', 'sleep'],
  // IT
  ['dormire', 'sleep'], ['stanco', 'sleepy'], ['esausto', 'sleep'], ['annoiato', 'sleep'],
  // JA
  ['nemui', 'sleep'], ['neru', 'sleep'], ['tsukareta', 'sleepy'],
  // KO
  ['pigonahda', 'sleepy'],

  // ── 💥 COLLISION — explosion, boom, burst ─────────────────────────────────
  // EN
  ['explosion', 'collision'], ['boom', 'collision'], ['explode', 'collision'],
  ['burst', 'collision'], ['popping', 'collision'],
  // FR
  ['boum', 'collision'],
  // ES
  ['explotar', 'collision'],
  // DE
  ['knall', 'collision'],
  // JA
  ['bakuhatsu', 'collision'],

  // ── 🌈 RAINBOW — hope, diversity, positivity ──────────────────────────────
  // EN
  ['rainbow', 'rainbow'], ['hope', 'rainbow'], ['colorful', 'rainbow'], ['diversity', 'rainbow'],
  // FR
  ['espoir', 'rainbow'], ['colore', 'rainbow'],
  // ES
  ['arcoiris', 'rainbow'], ['esperanza', 'rainbow'],
  // PT
  ['esperanca', 'rainbow'],
  // DE
  ['regenbogen', 'rainbow'], ['hoffnung', 'rainbow'],
  // IT
  ['arcobaleno', 'rainbow'], ['speranza', 'rainbow'],
  // JA
  ['niji', 'rainbow'], ['kibou', 'rainbow'],
  // KO
  ['mujigae', 'rainbow'],

  // ── 🌸 ROSE — romance, flowers, beauty, nature ────────────────────────────
  // EN
  ['rose', 'rose'], ['flower', 'rose'], ['flowers', 'rose'], ['bloom', 'rose'],
  ['bouquet', 'rose'],
  // FR
  ['fleur', 'rose'], ['jardinage', 'rose'],
  // ES
  ['flor', 'rose'], ['flores', 'rose'],
  // PT
  ['flor', 'rose'],
  // DE
  ['blume', 'rose'],
  // IT
  ['fiore', 'rose'],
  // JA
  ['hana', 'rose'], ['bara', 'rose'],
  // KO
  ['kkot', 'rose'], ['jangmi', 'rose'],
]

// Build lookup map from the array (first occurrence wins for duplicates)
const KEYWORD_MAP = new Map<string, EmojiName>()
for (const [keyword, emoji] of RAW_ENTRIES) {
  if (!KEYWORD_MAP.has(keyword)) {
    KEYWORD_MAP.set(keyword, emoji)
  }
}

function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (é→e, ñ→n, ü→u…)
    .replace(/[^a-z0-9]/g, '')       // remove punctuation, keep alphanumeric
}

/**
 * Scans word segments and generates timed emoji events based on keywords.
 * Enforces a cooldown to avoid emoji overload.
 */
export function generateEmojiEvents(segments: WordSegment[]): EmojiEvent[] {
  const COOLDOWN_S = 4        // minimum seconds between two emojis
  const MIN_DURATION_S = 1.8  // minimum display time per emoji
  const MAX_DURATION_S = 2.8  // cap display time

  const events: EmojiEvent[] = []
  let lastEventEnd = -Infinity

  for (const seg of segments) {
    const normalized = normalize(seg.word)
    const emoji = KEYWORD_MAP.get(normalized)
    if (!emoji) continue

    if (seg.start < lastEventEnd + COOLDOWN_S) continue

    const wordDuration = seg.end - seg.start
    const displayDuration = Math.min(MAX_DURATION_S, Math.max(MIN_DURATION_S, wordDuration))

    events.push({
      emoji,
      startTime: seg.start,
      endTime: seg.start + displayDuration,
    })

    lastEventEnd = seg.start + displayDuration
  }

  return events
}
