export type LangKey = 'en' | 'es' | 'pt' | 'de' | 'fr' | 'ja';

export const LANGUAGES: { key: LangKey; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
  { key: 'pt', label: 'Português' },
  { key: 'de', label: 'Deutsch' },
  { key: 'fr', label: 'Français' },
  { key: 'ja', label: '日本語' },
];

type UiKey =
  | 'heroDefaultLabel'
  | 'heroDefaultTagline'
  | 'heroCustomMix'
  | 'soundsSectionLabel'
  | 'catPopular'
  | 'catNoise'
  | 'catNature'
  | 'catFans'
  | 'catMusic'
  | 'catBinaural'
  | 'editPopular'
  | 'editPopularTitle'
  | 'editPopularHint'
  | 'done'
  | 'stopPlayingAfter'
  | 'timerOff'
  | 'timerCustom'
  | 'timerSheetTitle'
  | 'timerDuration'
  | 'timerEndTime'
  | 'timerShutoff'
  | 'timerStart'
  | 'savedMixes'
  | 'saveCurrent'
  | 'saveMixTitle'
  | 'saveMixPrompt'
  | 'nothingToSaveTitle'
  | 'nothingToSaveMsg'
  | 'deleteMixTitle'
  | 'cancel'
  | 'delete'
  | 'emptyPresetsHint'
  | 'footer'
  | 'settingsSectionLabel'
  | 'settingsBackgroundLabel'
  | 'settingsBackgroundHint'
  | 'settingsHapticsLabel'
  | 'settingsHapticsHint'
  | 'settingsThemeLabel'
  | 'settingsLanguageLabel'
  | 'playStart'
  | 'playStop';

export const UI: Record<UiKey, Record<LangKey, string>> = {
  heroDefaultLabel: { en: 'Choose a mix', es: 'Elige una mezcla', pt: 'Escolha uma mistura', de: 'Mix auswählen', fr: 'Choisir un mélange', ja: 'ミックスを選ぶ' },
  heroDefaultTagline: { en: 'Tap sounds below to build one.', es: 'Toca los sonidos de abajo para crear una.', pt: 'Toque nos sons abaixo para criar uma.', de: 'Tippe unten auf Sounds, um einen zu erstellen.', fr: 'Touchez les sons ci-dessous pour en créer un.', ja: '下の音をタップして作成しましょう。' },
  heroCustomMix: { en: 'Custom mix', es: 'Mezcla personalizada', pt: 'Mistura personalizada', de: 'Eigener Mix', fr: 'Mélange personnalisé', ja: 'カスタムミックス' },
  soundsSectionLabel: { en: 'Sounds — tap to mix', es: 'Sonidos — toca para mezclar', pt: 'Sons — toque para misturar', de: 'Sounds — zum Mischen tippen', fr: 'Sons — touchez pour mélanger', ja: 'サウンド — タップしてミックス' },
  catPopular: { en: 'Popular', es: 'Populares', pt: 'Populares', de: 'Beliebt', fr: 'Populaires', ja: '人気' },
  catNoise: { en: 'Static', es: 'Estática', pt: 'Estática', de: 'Rauschen', fr: 'Statique', ja: 'スタティック' },
  catNature: { en: 'Nature', es: 'Naturaleza', pt: 'Natureza', de: 'Natur', fr: 'Nature', ja: '自然' },
  catFans: { en: 'Fans', es: 'Ventiladores', pt: 'Ventiladores', de: 'Ventilatoren', fr: 'Ventilateurs', ja: '扇風機' },
  catMusic: { en: 'Music', es: 'Música', pt: 'Música', de: 'Musik', fr: 'Musique', ja: 'ミュージック' },
  catBinaural: { en: 'Headphone Tones', es: 'Tonos (auriculares)', pt: 'Tons (fones)', de: 'Kopfhörer-Töne', fr: 'Sons (écouteurs)', ja: 'ヘッドホン専用' },
  editPopular: { en: 'Edit', es: 'Editar', pt: 'Editar', de: 'Bearbeiten', fr: 'Modifier', ja: '編集' },
  editPopularTitle: { en: 'Edit Popular', es: 'Editar Populares', pt: 'Editar Populares', de: 'Beliebt bearbeiten', fr: 'Modifier les favoris', ja: '人気を編集' },
  editPopularHint: { en: 'Tap any sound to add or remove it from Popular.', es: 'Toca cualquier sonido para añadirlo o quitarlo de Populares.', pt: 'Toque em qualquer som para adicioná-lo ou removê-lo de Populares.', de: 'Tippe auf einen Sound, um ihn zu Beliebt hinzuzufügen oder zu entfernen.', fr: 'Touchez un son pour l’ajouter ou le retirer des favoris.', ja: 'サウンドをタップして人気への追加・削除ができます。' },
  done: { en: 'Done', es: 'Listo', pt: 'Concluído', de: 'Fertig', fr: 'Terminé', ja: '完了' },
  stopPlayingAfter: { en: 'Stop playing after', es: 'Detener después de', pt: 'Parar de tocar após', de: 'Wiedergabe stoppen nach', fr: "Arrêter la lecture après", ja: '再生停止までの時間' },
  timerOff: { en: 'Off', es: 'Apagado', pt: 'Desligado', de: 'Aus', fr: 'Désactivé', ja: 'オフ' },
  timerCustom: { en: 'Custom…', es: 'Personalizado…', pt: 'Personalizado…', de: 'Benutzerdefiniert…', fr: 'Personnalisé…', ja: 'カスタム…' },
  timerSheetTitle: { en: 'Timer', es: 'Temporizador', pt: 'Temporizador', de: 'Timer', fr: 'Minuterie', ja: 'タイマー' },
  timerDuration: { en: 'Duration', es: 'Duración', pt: 'Duração', de: 'Dauer', fr: 'Durée', ja: '時間指定' },
  timerEndTime: { en: 'End Time', es: 'Hora de fin', pt: 'Hora final', de: 'Endzeit', fr: 'Heure de fin', ja: '終了時刻' },
  timerShutoff: { en: 'Shutoff Time', es: 'Hora de apagado', pt: 'Hora de desligar', de: 'Abschaltzeit', fr: "Heure d'arrêt", ja: '停止時刻' },
  timerStart: { en: 'Start', es: 'Iniciar', pt: 'Iniciar', de: 'Starten', fr: 'Démarrer', ja: '開始' },
  savedMixes: { en: 'Saved mixes', es: 'Mezclas guardadas', pt: 'Misturas salvas', de: 'Gespeicherte Mixe', fr: 'Mélanges enregistrés', ja: '保存済みミックス' },
  saveCurrent: { en: '+ Save current', es: '+ Guardar actual', pt: '+ Salvar atual', de: '+ Aktuellen speichern', fr: '+ Enregistrer', ja: '+ 現在のミックスを保存' },
  saveMixTitle: { en: 'Save this mix', es: 'Guardar esta mezcla', pt: 'Salvar esta mistura', de: 'Diesen Mix speichern', fr: 'Enregistrer ce mélange', ja: 'このミックスを保存' },
  saveMixPrompt: { en: 'Give it a name', es: 'Ponle un nombre', pt: 'Dê um nome a ela', de: 'Gib ihm einen Namen', fr: 'Donnez-lui un nom', ja: '名前を付けてください' },
  nothingToSaveTitle: { en: 'Nothing to save', es: 'Nada que guardar', pt: 'Nada para salvar', de: 'Nichts zu speichern', fr: 'Rien à enregistrer', ja: '保存する内容がありません' },
  nothingToSaveMsg: { en: 'Turn on at least one sound first.', es: 'Activa al menos un sonido primero.', pt: 'Ative pelo menos um som primeiro.', de: 'Schalte zuerst mindestens einen Sound ein.', fr: "Activez d'abord au moins un son.", ja: '先に少なくとも1つの音をオンにしてください。' },
  deleteMixTitle: { en: 'Delete mix', es: 'Eliminar mezcla', pt: 'Excluir mistura', de: 'Mix löschen', fr: 'Supprimer le mélange', ja: 'ミックスを削除' },
  cancel: { en: 'Cancel', es: 'Cancelar', pt: 'Cancelar', de: 'Abbrechen', fr: 'Annuler', ja: 'キャンセル' },
  delete: { en: 'Delete', es: 'Eliminar', pt: 'Excluir', de: 'Löschen', fr: 'Supprimer', ja: '削除' },
  emptyPresetsHint: { en: 'Build a mix above, then save it here for later.', es: 'Crea una mezcla arriba y guárdala aquí para después.', pt: 'Crie uma mistura acima e salve aqui para depois.', de: 'Erstelle oben einen Mix und speichere ihn hier für später.', fr: 'Créez un mélange ci-dessus, puis enregistrez-le ici.', ja: '上でミックスを作り、ここに保存しておきましょう。' },
  footer: { en: 'No internet needed, and keeps playing when the screen is locked.', es: 'No necesita internet y sigue sonando con la pantalla bloqueada.', pt: 'Não precisa de internet e continua tocando com a tela bloqueada.', de: 'Kein Internet nötig, spielt auch bei gesperrtem Bildschirm weiter.', fr: "Aucun internet requis, continue de jouer écran verrouillé.", ja: 'インターネット不要。画面ロック中も再生を続けます。' },
  settingsSectionLabel: { en: 'Settings', es: 'Ajustes', pt: 'Configurações', de: 'Einstellungen', fr: 'Réglages', ja: '設定' },
  settingsBackgroundLabel: { en: 'Keep playing when locked or backgrounded', es: 'Seguir sonando con pantalla bloqueada', pt: 'Continuar tocando com tela bloqueada', de: 'Weiterspielen bei gesperrtem Bildschirm', fr: "Continuer en arrière-plan / écran verrouillé", ja: 'ロック中もバックグラウンド再生' },
  settingsBackgroundHint: { en: 'Turn off to pause automatically when you leave the app.', es: 'Desactívalo para pausar al salir de la app.', pt: 'Desative para pausar ao sair do app.', de: 'Deaktivieren, um beim Verlassen der App zu pausieren.', fr: "Désactivez pour mettre en pause en quittant l'app.", ja: 'オフにするとアプリを離れると自動的に一時停止します。' },
  settingsHapticsLabel: { en: 'Haptic feedback', es: 'Vibración táctil', pt: 'Retorno tátil', de: 'Haptisches Feedback', fr: 'Retour haptique', ja: '触覚フィードバック' },
  settingsHapticsHint: { en: 'Vibrate on taps like play, mix, and timer.', es: 'Vibrar al tocar reproducir, mezclar y temporizador.', pt: 'Vibrar ao tocar em reproduzir, misturar e temporizador.', de: 'Vibration bei Wiedergabe, Mix und Timer.', fr: 'Vibrer sur lecture, mélange et minuterie.', ja: '再生・ミックス・タイマー操作時に振動します。' },
  settingsThemeLabel: { en: 'Theme', es: 'Tema', pt: 'Tema', de: 'Design', fr: 'Thème', ja: 'テーマ' },
  settingsLanguageLabel: { en: 'Language', es: 'Idioma', pt: 'Idioma', de: 'Sprache', fr: 'Langue', ja: '言語' },
  playStart: { en: 'Start playback', es: 'Iniciar reproducción', pt: 'Iniciar reprodução', de: 'Wiedergabe starten', fr: 'Démarrer la lecture', ja: '再生を開始' },
  playStop: { en: 'Stop playback', es: 'Detener reproducción', pt: 'Parar reprodução', de: 'Wiedergabe stoppen', fr: 'Arrêter la lecture', ja: '再生を停止' },
};

export function t(lang: LangKey, key: UiKey): string {
  return UI[key][lang] ?? UI[key].en;
}

export type SoundKindI18n =
  | 'white' | 'pink' | 'brown' | 'rain' | 'ocean' | 'wind' | 'campfire' | 'thunder'
  | 'boxfan' | 'towerfan' | 'ceilingfan' | 'acunit' | 'largefloorfan' | 'smalldeskfan'
  | 'crickets' | 'music_soothe' | 'music_deepsleep' | 'music_ultrarelax' | 'music_healingcalm'
  | 'binaural_delta' | 'binaural_theta' | 'binaural_alpha';

export const SOUND_I18N: Record<SoundKindI18n, Record<LangKey, { label: string; tagline: string }>> = {
  white: {
    en: { label: 'White', tagline: 'Crisp, even hiss — like an old radio tuned between stations.' },
    es: { label: 'Blanco', tagline: 'Silbido uniforme y nítido, como una radio mal sintonizada.' },
    pt: { label: 'Branco', tagline: 'Chiado uniforme e nítido, como um rádio mal sintonizado.' },
    de: { label: 'Weiß', tagline: 'Klares, gleichmäßiges Rauschen — wie ein altes Radio.' },
    fr: { label: 'Blanc', tagline: 'Un souffle net et régulier, comme une vieille radio mal réglée.' },
    ja: { label: 'ホワイト', tagline: '古いラジオの選局音のような、均一で澄んだヒスノイズ。' },
  },
  pink: {
    en: { label: 'Pink', tagline: 'Softer, lower energy — closer to leaves in wind.' },
    es: { label: 'Rosa', tagline: 'Más suave y grave, como hojas en el viento.' },
    pt: { label: 'Rosa', tagline: 'Mais suave e grave, como folhas ao vento.' },
    de: { label: 'Rosa', tagline: 'Weicher, sanfter — wie Blätter im Wind.' },
    fr: { label: 'Rose', tagline: 'Plus doux, plus grave — comme des feuilles dans le vent.' },
    ja: { label: 'ピンク', tagline: 'より柔らかく穏やかな、風にそよぐ葉のような音。' },
  },
  brown: {
    en: { label: 'Brown', tagline: 'Deep, rumbling roll — surf, or a distant waterfall.' },
    es: { label: 'Marrón', tagline: 'Retumbo profundo, como el mar o una cascada lejana.' },
    pt: { label: 'Marrom', tagline: 'Ronco profundo, como o mar ou uma cachoeira distante.' },
    de: { label: 'Braun', tagline: 'Tiefes Grollen — wie Brandung oder ein ferner Wasserfall.' },
    fr: { label: 'Brun', tagline: 'Un grondement grave, comme la mer ou une cascade lointaine.' },
    ja: { label: 'ブラウン', tagline: '深く低い轟き。波の音や遠くの滝のような響き。' },
  },
  rain: {
    en: { label: 'Rain', tagline: 'Filtered noise with scattered patter — steady, soothing.' },
    es: { label: 'Lluvia', tagline: 'Ruido filtrado con repiqueteo disperso, constante y relajante.' },
    pt: { label: 'Chuva', tagline: 'Ruído filtrado com batidas dispersas, constante e relaxante.' },
    de: { label: 'Regen', tagline: 'Gefiltertes Rauschen mit verstreutem Prasseln — beruhigend.' },
    fr: { label: 'Pluie', tagline: 'Bruit filtré avec un crépitement épars, régulier et apaisant.' },
    ja: { label: '雨', tagline: '散らばる雨粒音を含む、穏やかで安定したノイズ。' },
  },
  ocean: {
    en: { label: 'Ocean', tagline: 'Slow rolling waves rising and falling on a shore.' },
    es: { label: 'Océano', tagline: 'Olas lentas que suben y bajan en la orilla.' },
    pt: { label: 'Oceano', tagline: 'Ondas lentas subindo e descendo na praia.' },
    de: { label: 'Ozean', tagline: 'Langsam rollende Wellen, die an den Strand branden.' },
    fr: { label: 'Océan', tagline: 'De lentes vagues qui montent et descendent sur le rivage.' },
    ja: { label: '海', tagline: '岸に打ち寄せてはゆっくり引く、うねる波の音。' },
  },
  wind: {
    en: { label: 'Wind', tagline: 'Gusting air moving through open space.' },
    es: { label: 'Viento', tagline: 'Ráfagas de aire moviéndose en un espacio abierto.' },
    pt: { label: 'Vento', tagline: 'Rajadas de ar se movendo em um espaço aberto.' },
    de: { label: 'Wind', tagline: 'Böiger Wind, der durch offenen Raum zieht.' },
    fr: { label: 'Vent', tagline: "Des rafales d'air qui traversent un espace ouvert." },
    ja: { label: '風', tagline: '広い空間を吹き抜ける、強弱のある風の音。' },
  },
  campfire: {
    en: { label: 'Campfire', tagline: 'Warm crackle and pop of a low fire.' },
    es: { label: 'Fogata', tagline: 'Crepitar cálido de un fuego bajo.' },
    pt: { label: 'Fogueira', tagline: 'Crepitar quente de um fogo baixo.' },
    de: { label: 'Lagerfeuer', tagline: 'Warmes Knistern und Knacken eines kleinen Feuers.' },
    fr: { label: 'Feu de camp', tagline: "Le crépitement chaleureux d'un petit feu." },
    ja: { label: 'キャンプファイヤー', tagline: '小さな火が立てる、温かいパチパチという音。' },
  },
  thunder: {
    en: { label: 'Thunder', tagline: 'Distant rolling rumble beneath a steady rain.' },
    es: { label: 'Trueno', tagline: 'Retumbo lejano bajo una lluvia constante.' },
    pt: { label: 'Trovão', tagline: 'Ronco distante sob uma chuva constante.' },
    de: { label: 'Donner', tagline: 'Fernes Grollen unter stetigem Regen.' },
    fr: { label: 'Tonnerre', tagline: 'Un grondement lointain sous une pluie régulière.' },
    ja: { label: '雷', tagline: '安定した雨音の下に響く、遠雷のとどろき。' },
  },
  boxfan: {
    en: { label: 'Box Fan', tagline: 'The classic bedroom box fan — steady hum and moving air.' },
    es: { label: 'Ventilador de caja', tagline: 'El clásico ventilador de dormitorio — zumbido constante.' },
    pt: { label: 'Ventilador de caixa', tagline: 'O clássico ventilador de quarto — zumbido constante.' },
    de: { label: 'Boxventilator', tagline: 'Der klassische Zimmerventilator — stetiges Brummen.' },
    fr: { label: 'Ventilateur de chambre', tagline: 'Le ventilateur classique — ronronnement régulier.' },
    ja: { label: 'ボックスファン', tagline: '定番の寝室用扇風機。安定したうなり音と風。' },
  },
  towerfan: {
    en: { label: 'Tower Fan', tagline: 'Smoother, airier whoosh — less motor, more breeze.' },
    es: { label: 'Ventilador de torre', tagline: 'Un soplido más suave y aireado, menos motor.' },
    pt: { label: 'Ventilador de coluna', tagline: 'Um sopro mais suave e leve, menos motor.' },
    de: { label: 'Turmventilator', tagline: 'Sanfteres Rauschen — weniger Motor, mehr Brise.' },
    fr: { label: 'Ventilateur colonne', tagline: 'Un souffle plus doux et aéré, moins de moteur.' },
    ja: { label: 'タワーファン', tagline: 'よりなめらかな風切り音。モーター音は控えめ。' },
  },
  ceilingfan: {
    en: { label: 'Ceiling Fan', tagline: 'Deep, slow-turning hum with a gentle blade flutter.' },
    es: { label: 'Ventilador de techo', tagline: 'Zumbido grave y lento con un suave aleteo de aspas.' },
    pt: { label: 'Ventilador de teto', tagline: 'Zumbido grave e lento com um leve bater de pás.' },
    de: { label: 'Deckenventilator', tagline: 'Tiefes, langsames Brummen mit sanftem Flügelschlag.' },
    fr: { label: 'Ventilateur de plafond', tagline: 'Un bourdonnement grave et lent, pales feutrées.' },
    ja: { label: 'シーリングファン', tagline: '低くゆったりとした回転音と、羽根の微かな揺らぎ。' },
  },
  acunit: {
    en: { label: 'Window AC', tagline: 'A rattly compressor drone — cool, steady, a little buzzy.' },
    es: { label: 'Aire acondicionado', tagline: 'Zumbido de compresor — fresco, constante, algo vibrante.' },
    pt: { label: 'Ar-condicionado', tagline: 'Zumbido de compressor — frio, constante, um pouco vibrante.' },
    de: { label: 'Klimaanlage', tagline: 'Rasselndes Kompressorbrummen — kühl, stetig, leicht surrend.' },
    fr: { label: 'Climatiseur', tagline: 'Un ronron de compresseur — frais, régulier, un peu vibrant.' },
    ja: { label: '窓用エアコン', tagline: 'ガタつくコンプレッサー音。涼しく安定した低いうなり。' },
  },
  largefloorfan: {
    en: { label: 'Large Floor Fan', tagline: 'A big standing fan — deep, powerful, moving a lot of air.' },
    es: { label: 'Ventilador de pie grande', tagline: 'Un ventilador grande — profundo y potente.' },
    pt: { label: 'Ventilador de pé grande', tagline: 'Um ventilador grande — profundo e potente.' },
    de: { label: 'Großer Standventilator', tagline: 'Ein großer Standventilator — tief und kraftvoll.' },
    fr: { label: 'Grand ventilateur sur pied', tagline: 'Un grand ventilateur — grave et puissant.' },
    ja: { label: '大型扇風機', tagline: '大きな据え置き扇風機。低く力強い風の音。' },
  },
  smalldeskfan: {
    en: { label: 'Small Desk Fan', tagline: 'A small, higher-pitched motor whir close by.' },
    es: { label: 'Ventilador de mesa', tagline: 'Un pequeño motor de tono agudo, cerca.' },
    pt: { label: 'Ventilador de mesa', tagline: 'Um pequeno motor de tom agudo, por perto.' },
    de: { label: 'Kleiner Tischventilator', tagline: 'Ein kleiner, höher klingender Motor in der Nähe.' },
    fr: { label: 'Petit ventilateur de bureau', tagline: 'Un petit moteur au ton plus aigu, tout proche.' },
    ja: { label: '小型デスクファン', tagline: '近くで鳴る、小さく高めのモーター音。' },
  },
  crickets: {
    en: { label: 'Night', tagline: 'Quiet dark with a chorus of distant crickets.' },
    es: { label: 'Noche', tagline: 'Oscuridad silenciosa con un coro de grillos lejanos.' },
    pt: { label: 'Noite', tagline: 'Escuridão silenciosa com um coro de grilos distantes.' },
    de: { label: 'Nacht', tagline: 'Stille Dunkelheit mit fernem Grillenchor.' },
    fr: { label: 'Nuit', tagline: 'Une obscurité silencieuse avec un chœur de grillons.' },
    ja: { label: '夜', tagline: '静かな闇に響く、遠くのコオロギの合唱。' },
  },
  music_soothe: {
    en: { label: 'Soothe', tagline: 'A soft, warm pad — gentle and unhurried.' },
    es: { label: 'Calma', tagline: 'Un pad suave y cálido, tranquilo y sin prisa.' },
    pt: { label: 'Suave', tagline: 'Um pad suave e quente, tranquilo e sem pressa.' },
    de: { label: 'Beruhigen', tagline: 'Ein weicher, warmer Klangteppich — sanft und ruhig.' },
    fr: { label: 'Apaiser', tagline: 'Une nappe douce et chaude, calme et sans hâte.' },
    ja: { label: 'ソゥーズ', tagline: '柔らかく温かいパッド音。穏やかでゆったり。' },
  },
  music_deepsleep: {
    en: { label: 'Deep Sleep', tagline: 'Low, slow-moving tones for drifting off.' },
    es: { label: 'Sueño profundo', tagline: 'Tonos graves y lentos para conciliar el sueño.' },
    pt: { label: 'Sono profundo', tagline: 'Tons graves e lentos para pegar no sono.' },
    de: { label: 'Tiefschlaf', tagline: 'Tiefe, langsame Klänge zum Einschlafen.' },
    fr: { label: 'Sommeil profond', tagline: 'Des tons graves et lents pour s\'endormir.' },
    ja: { label: 'ディープスリープ', tagline: '眠りに誘う、低くゆっくりとした音色。' },
  },
  music_ultrarelax: {
    en: { label: 'Ultra Relax', tagline: 'A brighter, shimmering pad with a light touch.' },
    es: { label: 'Ultra relax', tagline: 'Un pad brillante y ligero.' },
    pt: { label: 'Ultra relax', tagline: 'Um pad brilhante e leve.' },
    de: { label: 'Ultra-Entspannung', tagline: 'Ein helleres, schimmerndes Pad — leicht und luftig.' },
    fr: { label: 'Ultra détente', tagline: 'Une nappe plus claire et scintillante, tout en légèreté.' },
    ja: { label: 'ウルトラリラックス', tagline: '明るく煌めく、軽やかなパッド音。' },
  },
  music_healingcalm: {
    en: { label: 'Healing Calm', tagline: 'A warm, slowly breathing drone.' },
    es: { label: 'Calma sanadora', tagline: 'Un drone cálido que respira lentamente.' },
    pt: { label: 'Calma curativa', tagline: 'Um drone quente que respira lentamente.' },
    de: { label: 'Heilende Ruhe', tagline: 'Ein warmer, langsam atmender Drone-Klang.' },
    fr: { label: 'Calme apaisant', tagline: 'Un drone chaud qui respire lentement.' },
    ja: { label: 'ヒーリングカーム', tagline: 'ゆっくりと呼吸する、温かなドローン音。' },
  },
  binaural_delta: {
    en: { label: '🎧 Delta', tagline: 'A deep sleep tone — needs headphones, one tone per ear, to work.' },
    es: { label: '🎧 Delta', tagline: 'Tono de sueño profundo — necesita auriculares, un tono por oído.' },
    pt: { label: '🎧 Delta', tagline: 'Tom de sono profundo — precisa de fones, um tom por ouvido.' },
    de: { label: '🎧 Delta', tagline: 'Ein Tiefschlaf-Ton — braucht Kopfhörer, ein Ton pro Ohr.' },
    fr: { label: '🎧 Delta', tagline: 'Un ton de sommeil profond — écouteurs requis, un ton par oreille.' },
    ja: { label: '🎧 デルタ', tagline: '深い眠りのための音。左右で違う音を聞くのでヘッドホン必須。' },
  },
  binaural_theta: {
    en: { label: '🎧 Theta', tagline: 'A relaxation tone — needs headphones, one tone per ear, to work.' },
    es: { label: '🎧 Theta', tagline: 'Tono de relajación — necesita auriculares, un tono por oído.' },
    pt: { label: '🎧 Theta', tagline: 'Tom de relaxamento — precisa de fones, um tom por ouvido.' },
    de: { label: '🎧 Theta', tagline: 'Ein Entspannungs-Ton — braucht Kopfhörer, ein Ton pro Ohr.' },
    fr: { label: '🎧 Thêta', tagline: 'Un ton de relaxation — écouteurs requis, un ton par oreille.' },
    ja: { label: '🎧 シータ', tagline: 'リラックスのための音。左右で違う音を聞くのでヘッドホン必須。' },
  },
  binaural_alpha: {
    en: { label: '🎧 Alpha', tagline: 'A calm-focus tone — needs headphones, one tone per ear, to work.' },
    es: { label: '🎧 Alfa', tagline: 'Tono de calma y enfoque — necesita auriculares, un tono por oído.' },
    pt: { label: '🎧 Alfa', tagline: 'Tom de calma e foco — precisa de fones, um tom por ouvido.' },
    de: { label: '🎧 Alpha', tagline: 'Ein Ruhe-Fokus-Ton — braucht Kopfhörer, ein Ton pro Ohr.' },
    fr: { label: '🎧 Alpha', tagline: 'Un ton calme et concentré — écouteurs requis, un ton par oreille.' },
    ja: { label: '🎧 アルファ', tagline: '穏やかな集中のための音。左右で違う音を聞くのでヘッドホン必須。' },
  },
};

export function soundI18n(lang: LangKey, kind: SoundKindI18n): { label: string; tagline: string } {
  return SOUND_I18N[kind][lang] ?? SOUND_I18N[kind].en;
}
