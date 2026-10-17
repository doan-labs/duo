// The whole phrase list is bundled: translating live would need a network origin,
// and a traveller's phone is often offline exactly when a phrase matters.

export type LangId = 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'vi'
export type CatId = 'basics' | 'around' | 'eating' | 'shopping' | 'health'

/** `say` is a romanisation for scripts a reader may not know (Japanese). */
export type Line = { text: string; say?: string }
export type Phrase = { id: string; cat: CatId; en: string; to: Record<LangId, Line> }

export const LANGS: readonly { id: LangId; name: string; native: string }[] = [
  { id: 'es', name: 'Spanish', native: 'Español' },
  { id: 'fr', name: 'French', native: 'Français' },
  { id: 'de', name: 'German', native: 'Deutsch' },
  { id: 'it', name: 'Italian', native: 'Italiano' },
  { id: 'pt', name: 'Portuguese', native: 'Português' },
  { id: 'ja', name: 'Japanese', native: '日本語' },
  { id: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' }
]

export const CATS: readonly { id: CatId; name: string }[] = [
  { id: 'basics', name: 'Basics' },
  { id: 'around', name: 'Getting around' },
  { id: 'eating', name: 'Eating out' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'health', name: 'Help' }
]

type Rest = [es: string, fr: string, de: string, it: string, pt: string, vi: string]
const p = (cat: CatId, id: string, en: string, [es, fr, de, it, pt, vi]: Rest, ja: string, say: string): Phrase => ({
  id,
  cat,
  en,
  to: {
    es: { text: es },
    fr: { text: fr },
    de: { text: de },
    it: { text: it },
    pt: { text: pt },
    ja: { text: ja, say },
    vi: { text: vi }
  }
})

export const PHRASES: readonly Phrase[] = [
  p('basics', 'hello', 'Hello', ['Hola', 'Bonjour', 'Hallo', 'Ciao', 'Olá', 'Xin chào'], 'こんにちは', 'Konnichiwa'),
  p(
    'basics',
    'goodbye',
    'Goodbye',
    ['Adiós', 'Au revoir', 'Auf Wiedersehen', 'Arrivederci', 'Tchau', 'Tạm biệt'],
    'さようなら',
    'Sayōnara'
  ),
  p(
    'basics',
    'please',
    'Please',
    ['Por favor', "S'il vous plaît", 'Bitte', 'Per favore', 'Por favor', 'Làm ơn'],
    'お願いします',
    'Onegai shimasu'
  ),
  p(
    'basics',
    'thanks',
    'Thank you',
    ['Gracias', 'Merci', 'Danke', 'Grazie', 'Obrigado / Obrigada', 'Cảm ơn'],
    'ありがとうございます',
    'Arigatō gozaimasu'
  ),
  p(
    'basics',
    'welcome',
    "You're welcome",
    ['De nada', 'De rien', 'Gern geschehen', 'Prego', 'De nada', 'Không có gì'],
    'どういたしまして',
    'Dō itashimashite'
  ),
  p(
    'basics',
    'sorry',
    "I'm sorry",
    ['Lo siento', 'Je suis désolé(e)', 'Es tut mir leid', 'Mi dispiace', 'Desculpe', 'Xin lỗi'],
    'ごめんなさい',
    'Gomen nasai'
  ),
  p(
    'basics',
    'excuse',
    'Excuse me',
    ['Disculpe', 'Excusez-moi', 'Entschuldigung', 'Scusi', 'Com licença', 'Xin lỗi, cho tôi hỏi'],
    'すみません',
    'Sumimasen'
  ),
  p('basics', 'yes', 'Yes', ['Sí', 'Oui', 'Ja', 'Sì', 'Sim', 'Vâng'], 'はい', 'Hai'),
  p('basics', 'no', 'No', ['No', 'Non', 'Nein', 'No', 'Não', 'Không'], 'いいえ', 'Iie'),
  p(
    'basics',
    'understand',
    "I don't understand",
    ['No entiendo', 'Je ne comprends pas', 'Ich verstehe nicht', 'Non capisco', 'Não entendo', 'Tôi không hiểu'],
    'わかりません',
    'Wakarimasen'
  ),
  p(
    'basics',
    'english',
    'Do you speak English?',
    [
      '¿Habla inglés?',
      'Parlez-vous anglais ?',
      'Sprechen Sie Englisch?',
      'Parla inglese?',
      'Você fala inglês?',
      'Bạn có nói tiếng Anh không?'
    ],
    '英語を話せますか？',
    'Eigo o hanasemasu ka?'
  ),
  p(
    'basics',
    'slower',
    'Could you speak more slowly?',
    [
      '¿Puede hablar más despacio?',
      'Pouvez-vous parler plus lentement ?',
      'Können Sie bitte langsamer sprechen?',
      'Può parlare più lentamente?',
      'Pode falar mais devagar?',
      'Bạn có thể nói chậm hơn được không?'
    ],
    'もう少しゆっくり話してください。',
    'Mō sukoshi yukkuri hanashite kudasai.'
  ),

  p(
    'around',
    'toilet',
    'Where is the toilet?',
    [
      '¿Dónde está el baño?',
      'Où sont les toilettes ?',
      'Wo ist die Toilette?',
      "Dov'è il bagno?",
      'Onde fica o banheiro?',
      'Nhà vệ sinh ở đâu?'
    ],
    'トイレはどこですか？',
    'Toire wa doko desu ka?'
  ),
  p(
    'around',
    'station',
    'Where is the train station?',
    [
      '¿Dónde está la estación de tren?',
      'Où est la gare ?',
      'Wo ist der Bahnhof?',
      "Dov'è la stazione ferroviaria?",
      'Onde fica a estação de trem?',
      'Ga tàu ở đâu?'
    ],
    '駅はどこですか？',
    'Eki wa doko desu ka?'
  ),
  p(
    'around',
    'airport',
    'Where is the airport?',
    [
      '¿Dónde está el aeropuerto?',
      "Où est l'aéroport ?",
      'Wo ist der Flughafen?',
      "Dov'è l'aeroporto?",
      'Onde fica o aeroporto?',
      'Sân bay ở đâu?'
    ],
    '空港はどこですか？',
    'Kūkō wa doko desu ka?'
  ),
  p(
    'around',
    'ticket',
    'One ticket, please',
    [
      'Un billete, por favor',
      "Un billet, s'il vous plaît",
      'Eine Fahrkarte, bitte',
      'Un biglietto, per favore',
      'Uma passagem, por favor',
      'Cho tôi một vé'
    ],
    '切符を一枚お願いします。',
    'Kippu o ichimai onegai shimasu.'
  ),
  p(
    'around',
    'address',
    'Please take me to this address',
    [
      'Por favor, lléveme a esta dirección',
      "Pouvez-vous m'emmener à cette adresse ?",
      'Bitte bringen Sie mich zu dieser Adresse',
      'Mi porti a questo indirizzo, per favore',
      'Por favor, me leve a este endereço',
      'Làm ơn đưa tôi đến địa chỉ này'
    ],
    'この住所までお願いします。',
    'Kono jūsho made onegai shimasu.'
  ),
  p(
    'around',
    'lost',
    "I'm lost",
    [
      'Me he perdido',
      'Je me suis perdu(e)',
      'Ich habe mich verirrt',
      'Mi sono perso/a',
      'Eu me perdi',
      'Tôi bị lạc đường'
    ],
    '道に迷いました。',
    'Michi ni mayoimashita.'
  ),
  p(
    'around',
    'far',
    'Is it far?',
    ['¿Está lejos?', "C'est loin ?", 'Ist es weit?', 'È lontano?', 'É longe?', 'Có xa không?'],
    '遠いですか？',
    'Tōi desu ka?'
  ),
  p(
    'around',
    'map',
    'Can you show me on the map?',
    [
      '¿Puede mostrármelo en el mapa?',
      'Pouvez-vous me le montrer sur la carte ?',
      'Können Sie es mir auf der Karte zeigen?',
      'Può mostrarmelo sulla mappa?',
      'Pode me mostrar no mapa?',
      'Bạn có thể chỉ cho tôi trên bản đồ không?'
    ],
    '地図で教えてもらえますか？',
    'Chizu de oshiete moraemasu ka?'
  ),

  p(
    'eating',
    'table',
    'A table for two, please',
    [
      'Una mesa para dos, por favor',
      "Une table pour deux, s'il vous plaît",
      'Einen Tisch für zwei, bitte',
      'Un tavolo per due, per favore',
      'Uma mesa para dois, por favor',
      'Cho tôi một bàn cho hai người'
    ],
    '二人です。',
    'Futari desu.'
  ),
  p(
    'eating',
    'menu',
    'The menu, please',
    [
      'La carta, por favor',
      "La carte, s'il vous plaît",
      'Die Speisekarte, bitte',
      'Il menù, per favore',
      'O cardápio, por favor',
      'Cho tôi xem thực đơn'
    ],
    'メニューをお願いします。',
    'Menyū o onegai shimasu.'
  ),
  p(
    'eating',
    'water',
    'Water, please',
    [
      'Agua, por favor',
      "De l'eau, s'il vous plaît",
      'Wasser, bitte',
      'Acqua, per favore',
      'Água, por favor',
      'Cho tôi một ly nước'
    ],
    'お水をお願いします。',
    'Omizu o onegai shimasu.'
  ),
  p(
    'eating',
    'vegetarian',
    "I'm vegetarian",
    [
      'Soy vegetariano/a',
      'Je suis végétarien(ne)',
      'Ich bin Vegetarier(in)',
      'Sono vegetariano/a',
      'Sou vegetariano/a',
      'Tôi ăn chay'
    ],
    'ベジタリアンです。',
    'Bejitarian desu.'
  ),
  p(
    'eating',
    'peanuts',
    "I'm allergic to peanuts",
    [
      'Tengo alergia al cacahuete (maní)',
      'Je suis allergique aux cacahuètes',
      'Ich bin allergisch gegen Erdnüsse',
      'Sono allergico/a alle arachidi',
      'Tenho alergia a amendoim',
      'Tôi bị dị ứng đậu phộng (lạc)'
    ],
    'ピーナッツアレルギーがあります。',
    'Pīnattsu arerugī ga arimasu.'
  ),
  p(
    'eating',
    'spicy',
    'Is this spicy?',
    [
      '¿Esto es picante?',
      "C'est épicé ?",
      'Ist das scharf?',
      'È piccante?',
      'Isso é picante?',
      'Món này có cay không?'
    ],
    'これは辛いですか？',
    'Kore wa karai desu ka?'
  ),
  p(
    'eating',
    'delicious',
    'Delicious!',
    ['¡Está delicioso!', "C'est délicieux !", 'Das schmeckt köstlich!', 'È delizioso!', 'Está delicioso!', 'Ngon quá!'],
    'おいしい！',
    'Oishii!'
  ),
  p(
    'eating',
    'bill',
    'The bill, please',
    [
      'La cuenta, por favor',
      "L'addition, s'il vous plaît",
      'Die Rechnung, bitte',
      'Il conto, per favore',
      'A conta, por favor',
      'Cho tôi tính tiền'
    ],
    'お会計をお願いします。',
    'Okaikei o onegai shimasu.'
  ),

  p(
    'shopping',
    'price',
    'How much is this?',
    [
      '¿Cuánto cuesta esto?',
      'Combien ça coûte ?',
      'Wie viel kostet das?',
      'Quanto costa?',
      'Quanto custa?',
      'Cái này giá bao nhiêu?'
    ],
    'これはいくらですか？',
    'Kore wa ikura desu ka?'
  ),
  p(
    'shopping',
    'expensive',
    "It's too expensive",
    ['Es demasiado caro', "C'est trop cher", 'Das ist zu teuer', 'È troppo caro', 'É muito caro', 'Đắt quá'],
    '高すぎます。',
    'Takasugimasu.'
  ),
  p(
    'shopping',
    'card',
    'Can I pay by card?',
    [
      '¿Puedo pagar con tarjeta?',
      'Puis-je payer par carte ?',
      'Kann ich mit Karte zahlen?',
      'Posso pagare con la carta?',
      'Posso pagar com cartão?',
      'Tôi có thể trả bằng thẻ không?'
    ],
    'カードで払えますか？',
    'Kādo de haraemasu ka?'
  ),
  p(
    'shopping',
    'size',
    'Do you have a smaller size?',
    [
      '¿Tiene una talla más pequeña?',
      'Avez-vous une taille plus petite ?',
      'Haben Sie das in einer kleineren Größe?',
      'Ha una taglia più piccola?',
      'Você tem um tamanho menor?',
      'Bạn có cỡ nhỏ hơn không?'
    ],
    'もっと小さいサイズはありますか？',
    'Motto chiisai saizu wa arimasu ka?'
  ),
  p(
    'shopping',
    'looking',
    "I'm just looking",
    [
      'Solo estoy mirando',
      'Je regarde seulement',
      'Ich schaue nur',
      'Sto solo guardando',
      'Estou só olhando',
      'Tôi chỉ xem thôi'
    ],
    '見ているだけです。',
    'Miteiru dake desu.'
  ),
  p(
    'shopping',
    'take',
    "I'll take it",
    ['Me lo llevo', 'Je le prends', 'Ich nehme es', 'Lo prendo', 'Vou levar', 'Tôi sẽ lấy cái này'],
    'これをください。',
    'Kore o kudasai.'
  ),

  p(
    'health',
    'help',
    'Help!',
    ['¡Ayuda!', 'Au secours !', 'Hilfe!', 'Aiuto!', 'Socorro!', 'Cứu tôi với!'],
    '助けて！',
    'Tasukete!'
  ),
  p(
    'health',
    'doctor',
    'I need a doctor',
    [
      'Necesito un médico',
      "J'ai besoin d'un médecin",
      'Ich brauche einen Arzt',
      'Ho bisogno di un medico',
      'Preciso de um médico',
      'Tôi cần gặp bác sĩ'
    ],
    '医者が必要です。',
    'Isha ga hitsuyō desu.'
  ),
  p(
    'health',
    'ambulance',
    'Call an ambulance',
    [
      'Llame a una ambulancia',
      'Appelez une ambulance',
      'Rufen Sie einen Krankenwagen',
      "Chiami un'ambulanza",
      'Chame uma ambulância',
      'Hãy gọi xe cấp cứu'
    ],
    '救急車を呼んでください。',
    'Kyūkyūsha o yonde kudasai.'
  ),
  p(
    'health',
    'police',
    'Call the police',
    [
      'Llame a la policía',
      'Appelez la police',
      'Rufen Sie die Polizei',
      'Chiami la polizia',
      'Chame a polícia',
      'Hãy gọi cảnh sát'
    ],
    '警察を呼んでください。',
    'Keisatsu o yonde kudasai.'
  ),
  p(
    'health',
    'sick',
    'I feel sick',
    [
      'Me siento mal',
      'Je ne me sens pas bien',
      'Mir ist schlecht',
      'Non mi sento bene',
      'Não estou me sentindo bem',
      'Tôi cảm thấy không khỏe'
    ],
    '気分が悪いです。',
    'Kibun ga warui desu.'
  ),
  p(
    'health',
    'pharmacy',
    'Where is the pharmacy?',
    [
      '¿Dónde hay una farmacia?',
      'Où est la pharmacie ?',
      'Wo ist die Apotheke?',
      "Dov'è la farmacia?",
      'Onde fica a farmácia?',
      'Hiệu thuốc ở đâu?'
    ],
    '薬局はどこですか？',
    'Yakkyoku wa doko desu ka?'
  ),
  p(
    'health',
    'passport',
    'I lost my passport',
    [
      'He perdido mi pasaporte',
      "J'ai perdu mon passeport",
      'Ich habe meinen Reisepass verloren',
      'Ho perso il passaporto',
      'Perdi meu passaporte',
      'Tôi bị mất hộ chiếu'
    ],
    'パスポートをなくしました。',
    'Pasupōto o nakushimashita.'
  )
]
