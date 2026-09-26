// The catalog: real public-domain openings, one shelf per genre, and enough
// metadata per book to run the store, the audiobook shelf and the reader.
// Em dashes are banned repo-wide, so the excerpts use spaced hyphens.

export type Chapter = { title: string; paras: string[] }
export type Genre = 'Adventure' | 'Fantasy' | 'Mystery' | 'Gothic' | 'Sci-Fi' | 'Classic' | 'Romance'

export type Book = {
  id: string
  title: string
  author: string
  year: number
  genre: Genre
  pages: number
  about: string
  /** Full-length listen time as published, for the Audiobooks shelf. */
  audio?: { narrator: string; hours: number }
  chapters: Chapter[]
}

export const GENRES: Genre[] = ['Adventure', 'Fantasy', 'Mystery', 'Gothic', 'Sci-Fi', 'Classic', 'Romance']

export const BOOKS: Book[] = [
  {
    id: 'alice',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    year: 1865,
    genre: 'Fantasy',
    pages: 192,
    about:
      "One golden afternoon, a curious girl follows a white rabbit down a rabbit-hole and into a world where nothing is quite what it should be. Carroll's classic has delighted readers for a century and a half with its dream logic, wordplay and unforgettable cast: the Cheshire Cat, the Mad Hatter, the Queen of Hearts.",
    audio: { narrator: 'Scarlett Johansson', hours: 3 },
    chapters: [
      {
        title: 'Down the Rabbit-Hole',
        paras: [
          'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"',
          'So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.',
          'There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.',
          'In another moment down went Alice after it, never once considering how in the world she was to get out again.',
          'The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.',
          'Either the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs.',
          'She took down a jar from one of the shelves as she passed; it was labelled "ORANGE MARMALADE", but to her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody underneath, so managed to put it into one of the cupboards as she fell past it.',
          '"Well!" thought Alice to herself, "after such a fall as this, I shall think nothing of tumbling down stairs! How brave they\'ll all think me at home! Why, I wouldn\'t say anything about it, even if I fell off the top of the house!" (Which was very likely true.)'
        ]
      },
      {
        title: 'The Pool of Tears',
        paras: [
          '"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); "now I\'m opening out like the largest telescope that ever was! Good-bye, feet!" (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off).',
          '"Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I\'m sure I shan\'t be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can; but I must be kind to them," thought Alice, "or perhaps they won\'t walk the way I want to go!"',
          'Just at this moment her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.',
          'Poor Alice! It was as much as she could do, lying down on one side, to look through into the garden with one eye; but to get through was more hopeless than ever: she sat down and began to cry again.',
          '"You ought to be ashamed of yourself," said Alice, "a great girl like you," (she might well say this), "to go on crying in this way! Stop this moment, I tell you!" But she went on all the same, shedding gallons of tears, until there was a large pool all round her, about four inches deep and reaching half down the hall.',
          'After a time she heard a little pattering of feet in the distance, and she hastily dried her eyes to see what was coming. It was the White Rabbit returning, splendidly dressed, with a pair of white kid gloves in one hand and a large fan in the other: he came trotting along in a great hurry, muttering to himself as he came, "Oh! the Duchess, the Duchess! Oh! won\'t she be savage if I\'ve kept her waiting!"',
          'Alice felt so desperate that she was ready to ask help of any one; so, when the Rabbit came near her, she began, in a low, timid voice, "If you please, sir-" The Rabbit started violently, dropped the white kid gloves and the fan, and scurried away into the darkness as hard as he could go.'
        ]
      },
      {
        title: 'A Caucus-Race and a Long Tale',
        paras: [
          'They were indeed a queer-looking party that assembled on the bank - the birds with draggled feathers, the animals with their fur clinging close to them, and all dripping wet, cross, and uncomfortable.',
          'The first question of course was, how to get dry again: they had a consultation about this, and after a few minutes it seemed quite natural to Alice to find herself talking familiarly with them, as if she had known them all her life.',
          'At last the Mouse, who seemed to be a person of authority among them, called out, "Sit down, all of you, and listen to me! I\'ll soon make you dry enough!" They all sat down at once, in a large ring, with the Mouse in the middle.',
          '"Ahem!" said the Mouse with an important air, "are you all ready? This is the driest thing I know. Silence all round, if you please!"',
          '"Ugh!" said the Lory, with a shiver.',
          '"I beg your pardon!" said the Mouse, frowning, but very politely: "Did you speak?"',
          '"Not I!" said the Lory hastily.',
          '"I thought you did," said the Mouse. "I proceed."'
        ]
      }
    ]
  },
  {
    id: 'moby',
    title: 'Moby-Dick',
    author: 'Herman Melville',
    year: 1851,
    genre: 'Adventure',
    pages: 635,
    about:
      "Call me Ishmael. The story of Captain Ahab's obsessive hunt for the white whale is the great American sea novel: part adventure, part encyclopedia of the whale fishery, part meditation on fate, obsession and the ocean itself.",
    audio: { narrator: 'Frank Muller', hours: 21 },
    chapters: [
      {
        title: 'Loomings',
        paras: [
          'Call me Ishmael. Some years ago - never mind how long precisely - having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.',
          "Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off - then, I account it high time to get to sea as soon as I can.",
          'This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship. There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.',
          'There now is your insular city of the Manhattoes, belted round by wharves as Indian isles by coral reefs - commerce surrounds it with her surf. Right and left, the streets take you waterward. Its extreme downtown is the battery, where that noble mole is washed by waves, and cooled by breezes, which a few hours previous were out of sight of land. Look at the crowds of water-gazers there.',
          'Circumambulate the city of a dreamy Sabbath afternoon. Go from Corlears Hook to Coenties Slip, and from thence, by Whitehall, northward. What do you see? Posted like silent sentinels all around the town, stand thousands upon thousands of mortal men fixed in ocean reveries. Some leaning against the spiles; some seated upon the pier-heads; some looking over the bulwarks of ships from China; some high aloft in the rigging, as if striving to get a still better seaward peep.',
          'But these are all landsmen; of week days pent up in lath and plaster - tied to counters, nailed to benches, clinched to desks. How then is this? Are the green fields gone? What do they here?',
          'But look! here come more crowds, pacing straight for the water, and seemingly bound for a dive. Strange! Nothing will content them but the extremest limit of the land; loitering under the shady lee of yonder warehouses will not suffice. No. They must get just as nigh the water as they possibly can without falling in.',
          'And there they stand - miles of them - leagues. Inlanders all, they come from lanes and alleys, streets and avenues - north, east, south, and west. Yet here they all unite. Tell me, does the magnetic virtue of the needles of the compasses of all those ships attract them thither?',
          'Once more. Say you are in the country; in some high land of lakes. Take almost any path you please, and ten to one it carries you down in a dale, and leaves you there by a pool in the stream. There is magic in it. Let the most absent-minded of men be plunged in his deepest reveries - stand that man on his legs, set his feet a-going, and he will infallibly lead you to water, if water there be in all that region.',
          'Yes, as every one knows, meditation and water are wedded for ever.'
        ]
      },
      {
        title: 'The Carpet-Bag',
        paras: [
          'I stuffed a shirt or two into my old carpet-bag, tucked it under my arm, and started for Cape Horn and the Pacific. Quitting the good city of old Manhatto, I duly arrived in New Bedford. It was a Saturday night in December. Much was I disappointed upon learning that the little packet for Nantucket had already sailed, and that no way of reaching that place would offer, till the following Monday.',
          'As most young candidates for the pains and penalties of whaling stop at this same New Bedford, thence to embark on their voyage, it may as well be related that I, for one, had no idea of so doing. For my mind was made up to sail in no other than a Nantucket craft, because there was a fine, boisterous something about everything connected with that famous old island, which amazingly pleased me.',
          'Besides though New Bedford has of late been gradually monopolising the business of whaling, and though in this matter poor old Nantucket is now much behind her, yet Nantucket was her great original - the Tyre of this Carthage; - the place where the first dead American whale was stranded.',
          "It was a queer sort of place - a gable-ended old house, one side palsied as it were, and leaning over sadly. It stood on a sharp bleak corner, where that tempestuous wind Euroclydon kept up a worse howling than ever it did about poor Paul's tossed craft.",
          'Nevertheless, as this wind was a mighty one, and brought with it a most freezing sleet, and as I was compelled to face it directly, and had no place to go to except the bed, I began to think that after all I might possibly be preferable to the public-house.',
          '"The Spouter-Inn!" I exclaimed, as I looked up at a swinging sign over the door with a white painting upon it, faintly representing a tall straight jet of misty spray, and these words underneath - "The Spouter-Inn: - Peter Coffin."'
        ]
      },
      {
        title: 'The Spouter-Inn',
        paras: [
          'Entering that gable-ended Spouter-Inn, you found yourself in a wide, low, straggling entry with old-fashioned wainscots, reminding one of the bulwarks of some condemned old craft. On one side hung a very large oil-painting so thoroughly besmoked, and every way defaced, that in the unequal cross-lights by which you viewed it, it was only by diligent study and a series of systematic visits to it, and careful inquiry of the neighbors, that you could any way arrive at an understanding of its purpose.',
          'Such unaccountable masses of shades and shadows, that at first you almost thought some ambitious young artist, in the time of the New England hag, had endeavored to delineate chaos bewitched. But by dint of much and earnest contemplation, and oft repeated ponderings, and especially by throwing open the little window towards the back of the entry, you at last come to the conclusion that such an idea, however wild, might not be altogether unwarranted.',
          'But what most puzzled and confounded you was a long, limber, portentous, black mass of something hovering in the centre of the picture over three blue, dim, perpendicular lines floating in a nameless yeast. A boggy, soggy, squitchy picture truly, enough to drive a nervous man distracted. Yet was there a sort of indefinite, half-attained, unimaginable sublimity about it that fairly froze you to it, till you involuntarily took an oath with yourself to find out what that marvellous painting meant.',
          "Ever and anon a bright, but, alas, deceptive idea would dart you through. - It's the Black Sea in a midnight gale. - It's the unnatural combat of the four primal elements. - It's a blasted heath. - It's a Hyperborean winter scene. - It's the breaking-up of the icebound stream of Time.",
          "But at last all these fancies yielded to that one portentous something in the picture's midst. That once found out, and all the rest were plain. But stop; does it not bear a faint resemblance to a gigantic fish? even the great leviathan himself?"
        ]
      }
    ]
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: 1818,
    genre: 'Gothic',
    pages: 280,
    about:
      'A young scientist assembles a living creature from dead matter and recoils from what he has made. Shelley wrote the founding work of science fiction at eighteen, and its questions - what we owe the things we create, and what they owe us - have only sharpened since.',
    audio: { narrator: 'Dan Stevens', hours: 8 },
    chapters: [
      {
        title: 'Letter I',
        paras: [
          'To Mrs. Saville, England. St. Petersburgh, Dec. 11th, 17-',
          'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.',
          'I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.',
          'Inspirited by this wind of promise, my daydreams become more fervent and vivid. I try in vain to be persuaded that the pole is the seat of frost and desolation; it ever presents itself to my imagination as the region of beauty and delight.',
          'There, Margaret, the sun is for ever visible, its broad disk just skirting the horizon and diffusing a perpetual splendour. There - for with your leave, my sister, I will put some trust in preceding navigators - there snow and frost are banished; and, sailing over a calm sea, we may be wafted to a land surpassing in wonders and in beauty every region hitherto discovered on the habitable globe.',
          'Its productions and features may be without example, as the phenomena of the heavenly bodies undoubtedly are in those undiscovered solitudes. What may not be expected in a country of eternal light?',
          'I may there discover the wondrous power which attracts the needle and may regulate a thousand celestial observations that require only this voyage to render their seeming eccentricities consistent for ever. I shall satiate my ardent curiosity with the sight of a part of the world never before visited, and may tread a land never before imprinted by the foot of man.',
          'These are my enticements, and they are sufficient to conquer all fear of danger or death and to induce me to commence this laborious voyage with the joy a child feels when he embarks in a little boat, with his holiday mates, on an expedition of discovery up his native river. But supposing all these conjectures to be false, you cannot contest the inestimable benefit which I shall confer on all mankind, to the last generation, by discovering a passage near the pole to those countries, to reach which at present so many months are requisite; or by ascertaining the secret of the magnet, which, if at all possible, can only be effected by an undertaking such as mine.'
        ]
      },
      {
        title: 'Letter IV',
        paras: [
          'So strange an accident has happened to us that I cannot forbear recording it, although it is very probable that you will see me before these papers can come into your possession.',
          'Last Monday (July 31st) we were nearly surrounded by ice, which closed in the ship on all sides, scarcely leaving her the sea-room in which she floated. Our situation was somewhat dangerous, especially as we were compassed round by a very thick fog. We accordingly lay to, hoping that some change would take place in the atmosphere and weather.',
          "About two o'clock the mist cleared away, and we beheld, stretched out in every direction, vast and irregular plains of ice, which seemed to have no end. Some of my comrades groaned, and my own mind began to grow watchful with anxious thoughts, when a strange sight suddenly attracted our attention and diverted our solicitude from our own situation.",
          'We perceived a low carriage, fixed on a sledge and drawn by dogs, pass on towards the north, at the distance of half a mile; a being which had the shape of a man, but apparently of gigantic stature, sat in the sledge and guided the dogs. We watched the rapid progress of the traveller with our telescopes until he was lost among the distant inequalities of the ice.',
          'In the morning, however, as soon as it was light, I went upon deck and found all the sailors busy on one side of the vessel, apparently talking to someone in the sea. It was, in fact, a sledge, like that we had seen before, which had drifted towards us in the night on a large fragment of ice. Only one dog remained alive; but there was a human being within it whom the sailors were persuading to enter the vessel.',
          'He was not, as the other traveller seemed to be, a savage inhabitant of some undiscovered island, but a European. When I appeared on deck the master said, "Here is our captain, and he will not allow you to perish on the open sea."',
          'On perceiving me, the stranger addressed me in English, although with a foreign accent. "Before I come on board your vessel," said he, "will you have the kindness to inform me whither you are bound?"',
          'You may conceive my astonishment on hearing such a question addressed to me from a man on the brink of destruction and to whom I should have supposed that my vessel would have been a resource which he would not have exchanged for the most precious wealth the earth can afford.'
        ]
      },
      {
        title: 'Chapter I',
        paras: [
          'I am by birth a Genevese, and my family is one of the most distinguished of that republic. My ancestors had been for many years counsellors and syndics, and my father had filled several public situations with honour and reputation. He was respected by all who knew him for his integrity and indefatigable attention to public business.',
          'He passed his younger days perpetually occupied by the affairs of his country; a variety of circumstances had prevented his marrying early, nor was it until the decline of life that he became a husband and the father of a family.',
          'As the circumstances of his marriage illustrate his character, I cannot refrain from relating them. One of his most intimate friends was a merchant who, from a flourishing state, fell, through numerous mischances, into poverty. This man, whose name was Beaufort, was of a proud and unbending disposition and could not bear to live in poverty and oblivion in the same country where he had formerly been distinguished for his rank and magnificence.',
          'Having paid his debts, therefore, in the most honourable manner, he retreated with his daughter to the town of Lucerne, where he lived unknown and in wretchedness. My father loved Beaufort with the truest friendship and was deeply grieved by his retreat in these unfortunate circumstances.',
          'He bitterly deplored the false pride which led his friend to a conduct so little worthy of the affection that united them. He lost no time in endeavouring to seek him out, with the hope of persuading him to begin the world again through his credit and assistance.'
        ]
      }
    ]
  },
  {
    id: 'pride',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    genre: 'Romance',
    pages: 432,
    about:
      'It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife. Elizabeth Bennet meets the proud Mr. Darcy in the novel that perfected the comedy of manners - and invented a great deal of what we now call romance.',
    audio: { narrator: 'Rosamund Pike', hours: 11 },
    chapters: [
      {
        title: 'Chapter I',
        paras: [
          'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
          'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
          '"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"',
          'Mr. Bennet replied that he had not.',
          '"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."',
          'Mr. Bennet made no answer.',
          '"Do you not want to know who has taken it?" cried his wife impatiently.',
          '"You want to tell me, and I have no objection to hearing it."',
          'This was invitation enough.',
          '"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."',
          '"What is his name?"',
          '"Bingley."',
          '"Is he married or single?"',
          '"Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!"'
        ]
      },
      {
        title: 'Chapter II',
        paras: [
          'Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it.',
          'It was then disclosed in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with: "I hope Mr. Bingley will like it, Lizzy."',
          '"We are not in a way to know what Mr. Bingley likes," said her mother resentfully, "since we are not to visit."',
          '"But you forget, mamma," said Elizabeth, "that we shall meet him at the assemblies, and that Mrs. Long promised to introduce him."',
          '"I do not believe Mrs. Long will do any such thing. She has two nieces of her own. She is a selfish, hypocritical woman, and I have no opinion of her."',
          '"No more have I," said Mr. Bennet; "and I am glad to find that you do not depend on her serving you."',
          'Mrs. Bennet deigned not to make any reply, but, unable to contain herself, began scolding one of her daughters.'
        ]
      },
      {
        title: 'Chapter III',
        paras: [
          'Not all that Mrs. Bennet, however, with the assistance of her five daughters, could ask on the subject, was sufficient to draw from her husband any satisfactory description of Mr. Bingley. They attacked him in various ways - with barefaced questions, ingenious suppositions, and distant surmises; but he eluded the skill of them all, and they were at last obliged to accept the second-hand intelligence of their neighbour, Lady Lucas.',
          'Her report was highly favourable. Sir William had been delighted with him. He was quite young, wonderfully handsome, extremely agreeable, and, to crown the whole, he meant to be at the next assembly with a large party. Nothing could be more delightful!',
          "To be fond of dancing was a certain step towards falling in love; and very lively hopes of Mr. Bingley's heart were entertained.",
          '"If I can but see one of my daughters happily settled at Netherfield," said Mrs. Bennet to her husband, "and all the others equally well married, I shall have nothing to wish for."',
          "In a few days Mr. Bingley returned Mr. Bennet's visit, and sat about ten minutes with him in his library. He had entertained hopes of being admitted to a sight of the young ladies, of whose beauty he had heard much; but he saw only the father. The ladies were somewhat more fortunate, for they had the advantage of ascertaining from an upper window that he wore a blue coat, and rode a black horse."
        ]
      }
    ]
  },
  {
    id: 'dracula',
    title: 'Dracula',
    author: 'Bram Stoker',
    year: 1897,
    genre: 'Gothic',
    pages: 418,
    about:
      'A young solicitor travels to a castle in the Carpathians to close a property sale, and finds his host is not entirely alive. Stoker built the modern vampire out of letters, diaries and newspaper clippings, and every vampire since still works to his rules.',
    audio: { narrator: 'Tim Curry', hours: 15 },
    chapters: [
      {
        title: "Jonathan Harker's Journal",
        paras: [
          '3 May. Bistritz. - Left Munich at 8:35 P.M., on 1st May, arriving at Vienna early next morning; should have arrived at 6:46, but train was an hour late. Buda-Pesth seems a wonderful place, from the glimpse which I got of it from the train and the little I could walk through the streets. I feared to go very far from the station, as we had arrived late and would start as near the correct time as possible.',
          'The impression I had was that we were leaving the West and entering the East; the most western of splendid bridges over the Danube, which is here of noble width and depth, took us among the traditions of Turkish rule.',
          'We left in pretty good time, and came after nightfall to Klausenburgh. Here I stopped for the night at the Hotel Royale. I had for dinner, or rather supper, a chicken done up some way with red pepper, which was very good but thirsty. (Mem. get recipe for Mina.) I asked the waiter, and he said it was called "paprika hendl," and that, as it was a national dish, I should be able to get it anywhere along the Carpathians.',
          "I found my smattering of German very useful here, indeed, I don't know how I should be able to get on without it.",
          'Having had some time at my disposal when in London, I had visited the British Museum, and made search among the books and maps in the library regarding Transylvania; it had struck me that some foreknowledge of the country could hardly fail to have some importance in dealing with a nobleman of that country.',
          'I find that the district he named is in the extreme east of the country, just on the borders of three states, Transylvania, Moldavia, and Bukovina, in the midst of the Carpathian mountains; one of the wildest and least known portions of Europe.',
          'I was not able to light on any map or work giving the exact locality of the Castle Dracula, as there are no maps of this country as yet to compare with our own Ordnance Survey Maps; but I found that Bistritz, the post town named by Count Dracula, is a fairly well-known place.'
        ]
      },
      {
        title: "Jonathan Harker's Journal (continued)",
        paras: [
          'All day long we seemed to dawdle through a country which was full of beauty of every kind. Sometimes we saw little towns or castles on the top of steep hills such as we see in old missals; sometimes we ran by rivers and streams which seemed from the wide stony margin on each side of them to be subject to great floods.',
          'It takes a lot of water, and running strong, to sweep the outside edge of a river clear. At every station there were groups of people, sometimes crowds, and in all sorts of attire. Some of them were just like the peasants at home or those I saw coming through France and Germany, with short jackets and round hats and home-made trousers; but others were very picturesque.',
          'The women looked pretty, except when you got near them, but they were very clumsy about the waist. They had all full white sleeves of some kind or other, and most of them had big belts with a lot of strips of something fluttering from them like the dresses in a ballet, but of course there were petticoats under them.',
          'The strangest figures we saw were the Slovaks, who were more barbarian than the rest, with their big cow-boy hats, great baggy dirty-white trousers, white linen shirts, and enormous heavy leather belts, nearly a foot wide, all studded over with brass nails. They wore high boots, with their trousers tucked into them, and had long black hair and heavy black moustaches.',
          'They are very picturesque, but do not look prepossessing. On the stage they would be set down at once as some old Oriental band of brigands. They are, however, I am told, very harmless and rather wanting in natural self-assertion.',
          'It was on the dark side of twilight when we got to Bistritz, which is a very interesting old place. Being practically on the frontier - for the Borgo Pass leads from it into Bukovina - it has had a very stormy existence, and it certainly shows marks of it.'
        ]
      },
      {
        title: 'The Borgo Pass',
        paras: [
          'Soon we were hemmed in with trees, which in places arched right over the roadway till we passed as through a tunnel; and again great frowning rocks guarded us boldly on either side. Though we were in shelter, we could hear the rising wind, for it moaned and whistled through the rocks, and the branches of the trees crashed together as we swept along.',
          'It grew colder and colder still, and fine, powdery snow began to fall, so that soon we and all around us were covered with a white blanket. The keen wind still carried the howling of the dogs, though this grew fainter as we went on our way. The baying of the wolves sounded nearer and nearer, as though they were closing round on us from every side.',
          'I grew dreadfully afraid, and the horses shared my fear; but the driver was not in the least disturbed. He kept turning his head to left and right, but I could not see anything through the darkness.',
          'Suddenly, away on our left, I saw a faint flickering blue flame. The driver saw it at the same moment; he at once checked the horses, and, jumping to the ground, disappeared into the darkness. I did not know what to do, the less as the howling of the wolves grew closer; but while I wondered the driver suddenly appeared again, and without a word took his seat, and we resumed our journey.',
          'I think I must have fallen asleep and kept dreaming of the incident, for it seemed to be repeated endlessly, and now looking back, it is like a sort of awful nightmare.',
          'Then, far off in the distance, from the mountains on each side of us began a louder and a sharper howling - that of wolves - which affected both the horses and myself in the same way - for I was minded to jump from the calèche and run, whilst they reared again and plunged madly, so that the driver had to use all his great strength to keep them from bolting.'
        ]
      }
    ]
  },
  {
    id: 'time',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    year: 1895,
    genre: 'Sci-Fi',
    pages: 118,
    about:
      'A Victorian inventor explains to his dinner guests that time is only a fourth dimension, then proves it by vanishing into the year 802,701. Wells invented the time machine as we know it - and used it to visit the end of the world.',
    audio: { narrator: 'Simon Callow', hours: 4 },
    chapters: [
      {
        title: 'Chapter I',
        paras: [
          'The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His pale grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burnt brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.',
          'Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon, and there was that luxurious after-dinner atmosphere when thought runs gracefully free of the trammels of precision. And he put it to us in this way - marking the points with a lean forefinger - as we sat and lazily admired his earnestness over this new paradox (as we thought it) and his fecundity.',
          '"You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."',
          '"Is not that rather a large thing to expect us to begin upon?" said Filby, an argumentative person with red hair.',
          '"I do not mean to ask you to accept anything without reasonable ground for it. You will soon admit as much as I need from you. You know of course that a mathematical line, a line of thickness nil, has no real existence. They taught you that? Neither has a mathematical plane. These things are mere abstractions."',
          '"That is all right," said the Psychologist.',
          '"Nor, having only length, breadth, and thickness, can a cube have a real existence."',
          '"There I object," said Filby. "Of course a solid body may exist. All real things-"',
          '"So most people think. But wait a moment. Can an instantaneous cube exist?"',
          '"Don\'t follow you," said Filby.',
          '"Can a cube that does not last for any time at all, have a real existence?"',
          'Filby became pensive. "Clearly," the Time Traveller proceeded, "any real body must have extension in four directions: it must have Length, Breadth, Thickness, and - Duration."'
        ]
      },
      {
        title: 'Chapter II',
        paras: [
          '"But," said the Medical Man, staring hard at a coal in the fire, "if Time is really only a fourth dimension of Space, why is it, and why has it always been, regarded as something different? And why cannot we move in Time as we move about in the other dimensions of Space?"',
          'The Time Traveller smiled. "Are you so sure we can move freely in Space? Right and left we can go, backward and forward freely enough, and men always have done so. I admit we move freely in two dimensions. But how about up and down? Gravitation limits us there."',
          '"Not exactly," said the Medical Man. "There are balloons."',
          '"But before the balloons, save for spasmodic jumping and the inequalities of the surface, man had no freedom of vertical movement."',
          '"Still they could move a little up and down," said the Medical Man.',
          '"Easier, far easier down than up."',
          '"And you cannot move at all in Time, you cannot get away from the present moment."',
          '"My dear sir, that is just where you are wrong. That is just where the whole world has gone wrong. We are always getting away from the present moment. Our mental existences, which are immaterial and have no dimensions, are passing along the Time-Dimension with a uniform velocity from the cradle to the grave."'
        ]
      },
      {
        title: 'Chapter III',
        paras: [
          '"Last Friday I solved one of the small problems of life, and I am here tonight to tell you about it. I constructed a machine."',
          'He took one of the small octagonal tables that were scattered about the room, and set it in front of the fire, with two legs on the hearthrug. On this table he placed a mechanism. It was a glittering metallic framework, scarcely larger than a small clock, and very delicately made. There was ivory in it, and some transparent crystalline substance.',
          '"This little affair," said the Time Traveller, resting his elbows upon the table and pressing his hands together above the apparatus, "is only a model. It is my plan for a machine to travel through time. You will notice that it looks singularly askew, and that there is an odd twinkling appearance about this bar, as though it was in some way unreal."',
          'He pointed to the part with his finger. "Also, here is one little white lever, and here is another."',
          'The Medical Man got up out of his chair and peered into the thing. "It\'s beautifully made," he said.',
          '"It took two years to make," retorted the Time Traveller. Then, when we had all imitated the action of the Medical Man, he said: "Now I want you clearly to understand that this lever, being pressed over, sends the machine gliding into the future, and this other reverses the motion."',
          '"This saddle represents the seat of a time traveller. Presently I am going to press the lever, and off the machine will go. It will vanish, pass into future Time, and disappear."'
        ]
      }
    ]
  },
  {
    id: 'sherlock',
    title: 'A Scandal in Bohemia',
    author: 'Arthur Conan Doyle',
    year: 1891,
    genre: 'Mystery',
    pages: 68,
    about:
      'To Sherlock Holmes she is always THE woman. The first of the short stories sends a masked king, a compromising photograph and Irene Adler - the one person who ever out-thought him - to Baker Street.',
    audio: { narrator: 'Stephen Fry', hours: 1 },
    chapters: [
      {
        title: 'Part I',
        paras: [
          'To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind.',
          "He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer - excellent for drawing the veil from men's motives and actions.",
          'But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results. Grit in a sensitive instrument, or a crack in one of his own high-power lenses, would not be more disturbing than a strong emotion in a nature such as his.',
          'And yet there was but one woman to him, and that woman was the late Irene Adler, of dubious and questionable memory.',
          'I had seen little of Holmes lately. My marriage had drifted us away from each other. My own complete happiness, and the home-centred interests which rise up around the man who first finds himself master of his own establishment, were sufficient to absorb all my attention, while Holmes, who loathed every form of society with his whole Bohemian soul, remained in our lodgings in Baker Street, buried among his old books, and alternating from week to week between cocaine and ambition, the drowsiness of the drug, and the fierce energy of his own keen nature.',
          'He was still, as ever, deeply attracted by the study of crime, and occupied his immense faculties and extraordinary powers of observation in following out those clues, and clearing up those mysteries which had been abandoned as hopeless by the official police.',
          'One night - it was on the twentieth of March, 1888 - I was returning from a journey to a patient (for I had now returned to civil practice), when my way led me through Baker Street. As I passed the well-remembered door, which must always be associated in my mind with my wooing, and with the dark incidents of the Study in Scarlet, I was seized with a keen desire to see Holmes again, and to know how he was employing his extraordinary powers.'
        ]
      },
      {
        title: 'Part II',
        paras: [
          'His rooms were brilliantly lit, and, even as I looked up, I saw his tall, spare figure pass twice in a dark silhouette against the blind. He was pacing the room swiftly, eagerly, with his head sunk upon his chest and his hands clasped behind him. To me, who knew his every mood and habit, his attitude and manner told their own story. He was at work again. He had risen out of his drug-created dreams and was hot upon the scent of some new problem.',
          'I rang the bell and was shown up to the chamber which had formerly been in part my own.',
          'His manner was not effusive. It seldom was; but he was glad, I think, to see me. With hardly a word spoken, but with a kindly eye, he waved me to an armchair, threw across his case of cigars, and indicated a spirit case and a gasogene in the corner. Then he stood before the fire and looked me over in his singular introspective fashion.',
          '"Wedlock suits you," he remarked. "I think, Watson, that you have put on seven and a half pounds since I saw you."',
          '"Seven!" I answered.',
          '"Indeed, I should have thought a little more. Just a trifle more, I fancy, Watson. And in practice again, I observe. You did not tell me that you intended to go into harness."',
          '"Then, how do you know?"',
          '"I see it, I deduce it. How do I know that you have been getting yourself very wet lately, and that you have a most clumsy and careless servant girl?"',
          '"My dear Holmes," said I, "this is too much. You would certainly have been burned, had you lived a few centuries ago. It is true that I had a country walk on Thursday and came home in a dreadful mess, but as I have changed my clothes I can\'t imagine how you deduce it. As to Mary Jane, she is incorrigible, and my wife has given her notice, but there, again, I fail to see how you work it out."'
        ]
      },
      {
        title: 'Part III',
        paras: [
          'He chuckled to himself and rubbed his long, nervous hands together.',
          '"It is simplicity itself," said he; "my eyes tell me that on the inside of your left shoe, just where the firelight strikes it, the leather is scored by six almost parallel cuts. Obviously they have been caused by someone who has very carelessly scraped round the edges of the sole in order to remove crusted mud from it. Hence, you see, my double deduction that you had been out in vile weather, and that you had a particularly malignant boot-slitting specimen of the London slavey. As to your practice, if a gentleman walks into my rooms smelling of iodoform, with a black mark of nitrate of silver upon his right forefinger, and a bulge on the right side of his top-hat to show where he has secreted his stethoscope, I must be dull, indeed, if I do not pronounce him to be an active member of the medical profession."',
          'I could not help laughing at the ease with which he explained his process of deduction. "When I hear you give your reasons," I remarked, "the thing always appears to me to be so ridiculously simple that I could easily do it myself, though at each successive instance of your reasoning I am baffled until you explain your process. And yet I believe that my eyes are as good as yours."',
          '"Quite so," he answered, lighting a cigarette, and throwing himself down into an armchair. "You see, but you do not observe. The distinction is clear. For example, you have frequently seen the steps which lead up from the hall to this room."',
          '"Frequently."',
          '"How often?"',
          '"Well, some hundreds of times."',
          '"Then how many are there?"',
          '"How many? I don\'t know."',
          '"Quite so! You have not observed. And yet you have seen. That is just my point. Now, I know that there are seventeen steps, because I have both seen and observed."'
        ]
      }
    ]
  },
  {
    id: 'jane',
    title: 'Jane Eyre',
    author: 'Charlotte Bronte',
    year: 1847,
    genre: 'Classic',
    pages: 507,
    about:
      'A poor orphan governess takes a post at a house with a locked attic. Jane Eyre is the great first-person novel of self-respect - a voice so direct it still reads like a letter addressed to you, reader, personally.',
    audio: { narrator: 'Thandiwe Newton', hours: 19 },
    chapters: [
      {
        title: 'Chapter I',
        paras: [
          'There was no possibility of taking a walk that day. We had been wandering, indeed, in the leafless shrubbery an hour in the morning; but since dinner (Mrs. Reed, when there was no company, dined early) the cold winter wind had brought with it clouds so sombre, and a rain so penetrating, that further out-door exercise was now out of the question.',
          'I was glad of it: I never liked long walks, especially on chilly afternoons: dreadful to me was the coming home in the raw twilight, with nipped fingers and toes, and a heart saddened by the chidings of Bessie, the nurse, and humbled by the consciousness of my physical inferiority to Eliza, John, and Georgiana Reed.',
          'The said Eliza, John, and Georgiana were now clustered round their mama in the drawing-room: she lay reclined on a sofa by the fireside, and with her darlings about her (for the time neither quarrelling nor crying) looked perfectly happy. Me, she had dispensed from joining the group; saying, "She regretted to be under the necessity of keeping me at a distance; but that until she heard from Bessie, and could discover by her own observation, that I was endeavouring in good earnest to acquire a more sociable and childlike disposition, a more attractive and sprightly manner - something lighter, franker, more natural, as it were - she really must exclude me from privileges intended only for contented, happy, little children."',
          '"What does Bessie say I have done?" I asked.',
          '"Jane, I don\'t like cavillers or questioners; besides, there is something truly forbidding in a child taking up her elders in that manner. Be seated somewhere; and until you can speak pleasantly, remain silent."',
          'A breakfast-room adjoined the drawing-room, I slipped in there. It contained a bookcase: I soon possessed myself of a volume, taking care that it should be one stored with pictures. I mounted into the window-seat: gathering up my feet, I sat cross-legged, like a Turk; and, having drawn the red moreen curtain nearly close, I was shrined in double retirement.',
          'Folds of scarlet drapery shut in my view to the right hand; to the left were the clear panes of glass, protecting, but not separating me from the drear November day. At intervals, while turning over the leaves of my book, I studied the aspect of that winter afternoon.'
        ]
      },
      {
        title: 'Chapter II',
        paras: [
          'Afar, it offered a pale blank of mist and cloud; near a scene of wet lawn and storm-beat shrub, with ceaseless rain sweeping away wildly before a long and lamentable blast.',
          'I returned to my book - Bewick\'s History of British Birds: the letterpress thereof I cared little for, generally speaking; and yet there were certain introductory pages that, child as I was, I could not pass quite as a blank. They were those which treat of the haunts of sea-fowl; of "the solitary rocks and promontories" by them only inhabited.',
          'Nor could I pass unnoticed the suggestion of the bleak shores of Lapland, Siberia, Spitzbergen, Nova Zembla, Iceland, Greenland, with "the vast sweep of the Arctic Zone, and those forlorn regions of dreary space, - that reservoir of frost and snow, where firm fields of ice, the accumulation of centuries of winters, glazed in Alpine heights above heights, surround the pole, and concentre the multiplied rigours of extreme cold."',
          "Of these death-white realms I formed an idea of my own: shadowy, like all the half-comprehended notions that float dim through children's brains, but strangely impressive.",
          'With Bewick on my knee, I was then happy: happy at least in my way. I feared nothing but interruption, and that came too soon.',
          '"What do you want?" I asked, with awkward diffidence.',
          '"Say, \'What do you want, Master Reed?\'" was the answer. "I want you to come here," and seating himself in an armchair, he intimated by a gesture that I was to approach and stand before him.'
        ]
      },
      {
        title: 'Chapter III',
        paras: [
          'John Reed was a schoolboy of fourteen years old; four years older than I, for I was but ten: large and stout for his age, with a dingy and unwholesome skin; thick lineaments in a spacious visage, heavy limbs and large extremities.',
          'He gorged himself habitually at table, which made him bilious, and gave him a dim and bleared eye and flabby cheeks. He ought now to have been at school; but his mama had taken him home for a month or two, "on account of his delicate health."',
          'John had not much affection for his mother and sisters, and an antipathy to me. He bullied and punished me; not two or three times in the week, nor once or twice in the day, but continually: every nerve I had feared him, and every morsel of flesh in my bones shrank when he came near.',
          'There were moments when I was bewildered by the terror he inspired, because I had no appeal whatever against either his menaces or his inflictions; the servants did not like to offend their young master by taking my part against him, and Mrs. Reed was blind and deaf on the subject: she never saw him strike or heard him abuse me, though he did both now and then in her very presence.',
          'More frequently, however, behind her back. Habitually obedient to John, I came up to his chair: he spent some three minutes in thrusting out his tongue at me as far as he could without damaging the roots: I knew he would soon strike, and while dreading the blow, I mused on the disgusting and ugly appearance of him who would presently deal it.'
        ]
      }
    ]
  },
  {
    id: 'treasure',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    year: 1883,
    genre: 'Adventure',
    pages: 292,
    about:
      'An old sea-dog dies at the Admiral Benbow inn leaving a chest with a map inside. Jim Hawkins sails for the island with Squire Trelawney, Dr. Livesey and a one-legged cook named Long John Silver - the pirate every pirate since has been playing.',
    audio: { narrator: 'Alfred Molina', hours: 7 },
    chapters: [
      {
        title: 'The Old Sea-Dog at the Admiral Benbow',
        paras: [
          'Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having asked me to write down the whole particulars about Treasure Island, from the beginning to the end, keeping nothing back but the bearings of the island, and that only because there is still treasure not yet lifted, I take up my pen in the year of grace 17- and go back to the time when my father kept the Admiral Benbow inn and the brown old seaman with the sabre cut first took up his lodging under our roof.',
          'I remember him as if it were yesterday, as he came plodding to the inn door, his sea-chest following behind him in a hand-barrow - a tall, strong, heavy, nut-brown man, his tarry pigtail falling over the shoulder of his soiled blue coat, his hands ragged and scarred, with black, broken nails, and the sabre cut across one cheek, a dirty, livid white.',
          'I remember him looking round the cover and whistling to himself as he did so, and then breaking out in that old sea-song that he sang so often afterwards: "Fifteen men on the dead man\'s chest - Yo-ho-ho, and a bottle of rum!"',
          'In the high, old tottering voice that seemed to have been tuned and broken at the capstan bars. Then he rapped on the door with a bit of stick like a handspike that he carried, and when my father appeared, called roughly for a glass of rum.',
          'This, when it was brought to him, he drank slowly, like a connoisseur, lingering on the taste and still looking about him at the cliffs and up at our signboard.',
          '"This is a handy cove," says he at length; "and a pleasant sittyated grog-shop. Much company, mate?"',
          'My father told him no, very little company, the more was the pity.',
          '"Well, then," said he, "this is the berth for me."'
        ]
      },
      {
        title: 'Black Dog Appears and Disappears',
        paras: [
          'It was one January morning, very early - a pinching, frosty morning - the cove all grey with hoar-frost, the ripple lapping softly on the stones, the sun still low and only touching the hilltops and shining far to seaward. The captain had risen earlier than usual and set out down the beach, his cutlass swinging under the broad skirts of the old blue coat, his brass telescope under his arm, his hat tilted back upon his head.',
          'I remember his breath hanging like smoke in his wake as he strode off, and the last sound I heard of him as he turned the big rock was a loud snort of indignation, as though his mind was still running upon Dr. Livesey.',
          "Well, mother was upstairs with father and I was laying the breakfast-table against the captain's return when the parlour door opened and a man stepped in on whom I had never set my eyes before.",
          'He was a pale, tallowy creature, wanting two fingers of the left hand, and though he wore a cutlass, he did not look much like a fighter. I had always my eye open for seafaring men, with one leg or two, and I remember this one puzzled me. He was not sailorly, and yet he had a flavour of the sea about him too.',
          'I asked him what was for his service, and he said he would take rum; but as I was going out of the room to fetch it, he sat down upon a table and motioned me to draw near. I paused where I was, with my napkin in my hand.',
          '"Come here, sonny," says he. "Come nearer here."',
          'I took a step nearer.',
          '"Is this here table for my mate Bill?" he asked with a kind of leer.'
        ]
      },
      {
        title: 'The Black Spot',
        paras: [
          'I told him I did not know his mate Bill, and this was for a person who stayed in our house whom we called the captain.',
          '"Well," said he, "my mate Bill would be called the captain, as like as not. He had a cut on one cheek and a mighty pleasant way with him, particularly in drink, has my mate Bill. We\'ll put it, for argument like, that your captain has a cut on one cheek - and we\'ll put it, if you like, that that cheek\'s the right one. Ah, there! I told you so. Now is my mate Bill in this here house?"',
          'I told him he was out walking.',
          '"Which way, sonny? Which way is he gone?"',
          'And when I had pointed out the rock and told him how the captain was likely to return, and how soon, and answered a few other questions, "Ah," said he, "this\'ll be as good as drink to my mate Bill."',
          'The expression on his face as he said these words was not at all pleasant, and I had my own reasons for thinking that the stranger was mistaken, even supposing he meant what he said. But it was no affair of mine, I thought; and besides, it was difficult to know what to do.',
          'The stranger kept hanging about just inside the inn door, peering round the corner like a cat waiting for a mouse. Once I stepped out myself into the road, but he immediately called me back, and as I did not obey quick enough for his fancy, a most horrible change came over his tallowy face, and he ordered me in with an oath that made me jump.'
        ]
      }
    ]
  },
  {
    id: 'peter',
    title: 'Peter Pan',
    author: 'J. M. Barrie',
    year: 1911,
    genre: 'Fantasy',
    pages: 212,
    about:
      "All children, except one, grow up. The boy who wouldn't arrives at the Darling nursery window one night looking for his shadow, and carries Wendy and her brothers off to Neverland - where the lost boys, the mermaids and Captain Hook are waiting.",
    audio: { narrator: 'Lily Collins', hours: 5 },
    chapters: [
      {
        title: 'Peter Breaks Through',
        paras: [
          'All children, except one, grow up. They soon know that they will grow up, and the way Wendy knew was this. One day when she was two years old she was playing in a garden, and she plucked another flower and ran with it to her mother. I suppose she must have looked rather delightful, for Mrs. Darling put her hand to her heart and cried, "Oh, why can\'t you remain like this for ever!"',
          'This was all that passed between them on the subject, but henceforth Wendy knew that she must grow up. You always know after you are two. Two is the beginning of the end.',
          'Of course they lived at 14, and until Wendy came her mother was the chief one. She was a lovely lady, with a romantic mind and such a sweet mocking mouth. Her romantic mind was like the tiny boxes, one within the other, that come from the puzzling East, however many you discover there is always one more; and her sweet mocking mouth had one kiss on it that Wendy could never get, though there it was, perfectly conspicuous in the right-hand corner.',
          'The way Mr. Darling won her was this: the many gentlemen who had been boys when she was a girl discovered simultaneously that they loved her, and they all ran to her house to propose to her except Mr. Darling, who took a cab and nipped in first, and so he got her.',
          'He got all of her, except the innermost box and the kiss. He never knew about the box, and in time he gave up trying for the kiss. Wendy thought Napoleon could have got it, but I can picture him trying, and then going off in a passion, slamming the door.',
          'Mr. Darling used to boast to Wendy that her mother not only loved him but respected him. He was one of those deep ones who know about stocks and shares. Of course no one really knows, but he quite seemed to know, and he often said stocks were up and shares were down in a way that would have made any woman respect him.'
        ]
      },
      {
        title: 'The Shadow',
        paras: [
          "Mrs. Darling first heard of Peter when she was tidying up her children's minds. It is the nightly custom of every good mother after her children are asleep to rummage in their minds and put things straight for next morning, repacking into their proper places the many articles that have wandered during the day.",
          "If you could keep awake (but of course you can't) you would see your own mother doing this, and you would find it very interesting to watch her. It is quite like tidying up drawers. You would see her on her knees, I expect, lingering humorously over some of your contents, wondering where on earth you had picked this thing up, making discoveries sweet and not so sweet, pressing this to her cheek as if it were as nice as a kitten, and hurriedly stowing that out of sight.",
          'When you wake in the morning, the naughtiness and evil passions with which you went to bed have been folded up small and placed at the bottom of your mind and on the top, beautifully aired, are spread out your prettier thoughts, ready for you to put on.',
          "I don't know whether you have ever seen a map of a person's mind. Doctors sometimes draw maps of other parts of you, and your own map can become intensely interesting, but catch them trying to draw a map of a child's mind, which is not only confused, but keeps going round all the time.",
          'There are zigzag lines on it, just like your temperature on a card, and these are probably roads in the island, for the Neverland is always more or less an island, with astonishing splashes of colour here and there, and coral reefs and rakish-looking craft in the offing, and savages and lonely lairs, and gnomes who are mostly tailors, and caves through which a river runs.'
        ]
      },
      {
        title: 'Come Away, Come Away!',
        paras: [
          "For a moment after Mr. and Mrs. Darling left the house the night-lights by the beds of the three children continued to burn clearly. They were awfully nice little night-lights, and one cannot help wishing that they could have kept awake to see Peter; but Wendy's light blinked and gave such a yawn that the other two yawned also, and before they could close their mouths all the three went out.",
          "There was another light in the room now, a thousand times brighter than the night-lights, and in the time we have taken to say this, it had been in all the drawers in the nursery, looking for Peter's shadow, rummaged the wardrobe and turned every pocket inside out.",
          'It was not really a light; it made this light by flashing about so quickly, but when it came to rest for a second you saw it was a fairy, no longer than your hand, but still growing. It was a girl called Tinker Bell exquisitely gowned in a skeleton leaf, cut low and square, through which her figure could be seen to the best advantage. She was slightly inclined to embonpoint.',
          "A moment after the fairy's entrance the window was blown open by the breathing of the little stars, and Peter dropped in. He had carried Tinker Bell part of the way, and his hand was still messy with the fairy dust.",
          '"Tinker Bell," he called softly, after making sure that the children were asleep, "Tink, where are you?" She was in a jug for the moment, and liking it extremely; she had never been in a jug before.',
          '"Oh, do come out of that jug, and tell me, do you know where they put my shadow?"'
        ]
      }
    ]
  },
  {
    id: 'gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: 1925,
    genre: 'Classic',
    pages: 180,
    about:
      "Nick Carraway rents a cottage on Long Island next door to a mansion where the parties never end and the host, Jay Gatsby, is a rumor attached to a green light across the bay. Fitzgerald's novel is the American one - about money, longing, and the past you can't quite get back to.",
    audio: { narrator: 'Jake Gyllenhaal', hours: 5 },
    chapters: [
      {
        title: 'Chapter I',
        paras: [
          "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.",
          '"Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world haven\'t had the advantages that you\'ve had."',
          "He didn't say any more but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence I'm inclined to reserve all judgments, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores.",
          'The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men.',
          'Most of the confidences were unsought - frequently I have feigned sleep, preoccupation, or a hostile levity when I realized by some unmistakable sign that an intimate revelation was quivering on the horizon - for the intimate revelations of young men or at least the terms in which they express them are usually plagiaristic and marred by obvious suppressions.',
          'Reserving judgments is a matter of infinite hope. I am still a little afraid of missing something if I forget that, as my father snobbishly suggested, and I snobbishly repeat, a sense of the fundamental decencies is parcelled out unequally at birth.',
          "And, after boasting this way of my tolerance, I come to the admission that it has a limit. Conduct may be founded on the hard rock or the wet marshes but after a certain point I don't care what it's founded on.",
          'When I came back from the East last autumn I felt that I wanted the world to be in uniform and at a sort of moral attention forever; I wanted no more riotous excursions with privileged glimpses into the human heart. Only Gatsby, the man who gives his name to this book, was exempt from my reaction - Gatsby who represented everything for which I have an unaffected scorn.'
        ]
      },
      {
        title: 'Chapter I (continued)',
        paras: [
          'If personality is an unbroken series of successful gestures, then there was something gorgeous about him, some heightened sensitivity to the promises of life, as if he were related to one of those intricate machines that register earthquakes ten thousand miles away.',
          'This responsiveness had nothing to do with that flabby impressionability which is dignified under the name of the "creative temperament" - it was an extraordinary gift for hope, a romantic readiness such as I have never found in any other person and which it is not likely I shall ever find again.',
          'No - Gatsby turned out all right at the end; it is what preyed on Gatsby, what foul dust floated in the wake of his dreams that temporarily closed out my interest in the abortive sorrows and short-winded elations of men.',
          "My family have been prominent, well-to-do people in this middle-western city for three generations. The Carraways are something of a clan and we have a tradition that we're descended from the Dukes of Buccleuch, but the actual founder of my line was my grandfather's brother who came here in fifty-one, sent a substitute to the Civil War and started the wholesale hardware business that my father carries on today.",
          'I graduated from New Haven in 1915, just a quarter of a century after my father, and a little later I participated in that delayed Teutonic migration known as the Great War. I enjoyed the counter-raid so thoroughly that I came back restless. Instead of being the warm center of the world the middle-west now seemed like the ragged edge of the universe - so I decided to go east and learn the bond business.'
        ]
      },
      {
        title: 'West Egg',
        paras: [
          'I lived at West Egg, the - well, the less fashionable of the two, though this is a most superficial tag to express the bizarre and not a little sinister contrast between them. My house was at the very tip of the egg, only fifty yards from the Sound, and squeezed between two huge places that rented for twelve or fifteen thousand a season.',
          'The one on my right was a colossal affair by any standard - it was a factual imitation of some Hotel de Ville in Normandy, with a tower on one side, spanking new under a thin beard of raw ivy, and a marble swimming pool and more than forty acres of lawn and garden.',
          "It was Gatsby's mansion. Or rather, as I didn't know Mr. Gatsby it was a mansion inhabited by a gentleman of that name. My own house was an eye-sore, but it was a small eye-sore, and it had been overlooked, so I had a view of the water, a partial view of my neighbor's lawn, and the consoling proximity of millionaires - all for eighty dollars a month.",
          'Across the courtesy bay the white palaces of fashionable East Egg glittered along the water, and the history of the summer really begins on the evening I drove over there to have dinner with the Tom Buchanans.',
          "Daisy was my second cousin once removed and I'd known Tom in college. And just after the war I spent two days with them in Chicago."
        ]
      }
    ]
  },
  {
    id: 'dorian',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    year: 1890,
    genre: 'Classic',
    pages: 254,
    about:
      "A beautiful young man wishes that his portrait would age instead of him, and the wish is granted. Wilde's only novel is a comedy of dandies and epigrams wrapped around a horror story - the portrait in the attic is the one that keeps the score.",
    audio: { narrator: 'Edoardo Ballerini', hours: 8 },
    chapters: [
      {
        title: 'The Preface',
        paras: [
          "The artist is the creator of beautiful things. To reveal art and conceal the artist is art's aim. The critic is he who can translate into another manner or a new material his impression of beautiful things.",
          'The highest as the lowest form of criticism is a mode of autobiography. Those who find ugly meanings in beautiful things are corrupt without being charming. This is a fault.',
          'Those who find beautiful meanings in beautiful things are the cultivated. For these there is hope. They are the elect to whom beautiful things mean only beauty.',
          'There is no such thing as a moral or an immoral book. Books are well written, or badly written. That is all.',
          'The nineteenth century dislike of realism is the rage of Caliban seeing his own face in a glass. The nineteenth century dislike of romanticism is the rage of Caliban not seeing his own face in a glass.',
          'The moral life of man forms part of the subject-matter of the artist, but the morality of art consists in the perfect use of an imperfect medium.',
          'No artist desires to prove anything. Even things that are true can be proved. No artist has ethical sympathies. An ethical sympathy in an artist is an unpardonable mannerism of style.',
          'All art is quite useless.'
        ]
      },
      {
        title: 'Chapter I',
        paras: [
          'The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac, or the more delicate perfume of the pink-flowering thorn.',
          'From the corner of the divan of Persian saddle-bags on which he was lying, smoking, as was his custom, innumerable cigarettes, Lord Henry Wotton could just catch the gleam of the honey-sweet and honey-coloured blossoms of a laburnum, whose tremulous branches seemed hardly able to bear the burden of a beauty so flamelike as theirs.',
          'And now and then the fantastic shadows of birds in flight flitted across the long tussore-silk curtains that were stretched in front of the huge window, producing a kind of momentary Japanese effect, and making him think of those pallid, jade-faced painters of Tokyo who, through the medium of an art that is necessarily immobile, seek to convey the sense of swiftness and motion.',
          'The sullen murmur of the bees shouldering their way through the long unmown grass, or circling with monotonous insistence round the dusty gilt horns of the straggling woodbine, seemed to make the stillness more oppressive. The dim roar of London was like the bourdon note of a distant organ.',
          'In the centre of the room, clamped to an upright easel, stood the full-length portrait of a young man of extraordinary personal beauty, and in front of it, some little distance away, was sitting the artist himself, Basil Hallward, whose sudden disappearance some years ago caused, at the time, such public excitement and gave rise to so many strange conjectures.',
          'As the painter looked at the gracious and comely form he had so skilfully mirrored in his art, a smile of pleasure passed across his face, and seemed about to linger there. But he suddenly started up, and closing his eyes, placed his fingers upon the lids, as though he sought to imprison within his brain some curious dream from which he feared he might awake.'
        ]
      },
      {
        title: 'Chapter II',
        paras: [
          '"It is your best work, Basil, the best thing you have ever done," said Lord Henry languidly. "You must certainly send it next year to the Grosvenor. The Academy is too large and too vulgar. Whenever I have gone there, there have been either so many people that I have not been able to see the pictures, which was dreadful, or so many pictures that I have not been able to see the people, which was worse. The Grosvenor is really the only place."',
          '"I don\'t think I shall send it anywhere," he answered, tossing his head back in that odd way that used to make his friends laugh at him at Oxford. "No, I won\'t send it anywhere."',
          'Lord Henry elevated his eyebrows and looked at him in amazement through the thin blue wreaths of smoke that curled up in such fanciful whorls from his heavy, opium-tainted cigarette.',
          '"Not send it anywhere? My dear fellow, why? Have you any reason? What odd chaps you painters are! You do anything in the world to gain a reputation. As soon as you have one, you seem to want to throw it away. It is silly of you, for there is only one thing in the world worse than being talked about, and that is not being talked about."',
          '"A portrait like this would set you far above all the young men in England, and make the old men quite jealous, if old men are ever capable of any emotion."',
          '"I know you will laugh at me," he replied, "but I really can\'t exhibit it. I have put too much of myself into it."',
          'Lord Henry stretched himself out on the divan and laughed.',
          '"Yes, I knew you would; but it is quite true, all the same."'
        ]
      }
    ]
  },
  {
    id: 'heart',
    title: 'Heart of Darkness',
    author: 'Joseph Conrad',
    year: 1899,
    genre: 'Classic',
    pages: 96,
    about:
      'Marlow takes a steamboat up a river into the interior to fetch a company agent named Kurtz, and the journey keeps going after the river ends. Conrad wrote it as a serial in three parts; Apocalypse Now is its descendant.',
    audio: { narrator: 'Kenneth Branagh', hours: 4 },
    chapters: [
      {
        title: 'Part I',
        paras: [
          'The Nellie, a cruising yawl, swung to her anchor without a flutter of the sails, and was at rest. The flood had made, the wind was nearly calm, and being bound down the river, the only thing for it was to come to and wait for the turn of the tide.',
          'The sea-reach of the Thames stretched before us like the beginning of an interminable waterway. In the offing the sea and the sky were welded together without a joint, and in the luminous space the tanned sails of the barges drifting up with the tide seemed to stand still in red clusters of canvas sharply peaked, with gleams of varnished sprits. A haze rested on the low shores that ran out to sea in vanishing flatness.',
          'The air was dark above Gravesend, and farther back still seemed condensed into a mournful gloom, brooding motionless over the biggest, and the greatest, town on earth.',
          'The Director of Companies was our captain and our host. We four affectionately watched his back as he stood in the bows looking to seaward. On the whole river there was nothing that looked half so nautical. He resembled a pilot, which to a seaman is trustworthiness personified.',
          "Between us there was, as I have already said somewhere, the bond of the sea. Besides holding our hearts together through long periods of separation, it had the effect of making us tolerant of each other's yarns - and even convictions.",
          'The Lawyer - the best of old fellows - had, because of his many years and many virtues, the only cushion on deck, and was lying on the only rug. The Accountant had brought out already a box of dominoes, and was toying architecturally with the bones. Marlow sat cross-legged right aft, leaning against the mizzen-mast. He had sunken cheeks, a yellow complexion, a straight back, an ascetic aspect, and, with his arms dropped, the palms of hands outwards, resembled an idol.'
        ]
      },
      {
        title: 'Part I (continued)',
        paras: [
          '"And this also," said Marlow suddenly, "has been one of the dark places of the earth."',
          'He was the only man of us who still "followed the sea." The worst that could be said of him was that he did not represent his class. He was a seaman, but he was a wanderer, too, while most seamen lead, if one may so express it, a sedentary life.',
          'Their minds are of the stay-at-home order, and their home is always with them - the ship; and so is their country - the sea. One ship is very much like another, and the sea is always the same. In the immutability of their surroundings the foreign shores, the foreign faces, the changing immensity of life, glide past, veiled not by a sense of mystery but by a slightly disdainful ignorance; for there is nothing mysterious to a seaman unless it be the sea itself, which is the mistress of his existence and as inscrutable as Destiny.',
          'For the rest, after his hours of work, a casual stroll or a casual spree on shore suffices to unfold for him the secret of a whole continent, and generally he finds the secret not worth knowing. The yarns of seamen have a direct simplicity, the whole meaning of which lies within the shell of a cracked nut.',
          'But Marlow was not typical (if his propensity to spin yarns be excepted), and to him the meaning of an episode was not inside like a kernel but outside, enveloping the tale which brought it out only as a glow brings out a haze, in the likeness of one of these misty halos that sometimes are made visible by the spectral illumination of moonshine.',
          'His remark did not seem at all surprising. It was just like Marlow. It was accepted in silence. Nobody took the trouble to grunt even; and presently he said, very slow - "I was thinking of very old times, when the Romans first came here, nineteen hundred years ago - the other day..."'
        ]
      },
      {
        title: 'The River',
        paras: [
          '"Going up that river was like travelling back to the earliest beginnings of the world, when vegetation rioted on the earth and the big trees were kings. An empty stream, a great silence, an impenetrable forest. The air was warm, thick, heavy, sluggish. There was no joy in the brilliance of sunshine.',
          'The long stretches of the waterway ran on, deserted, into the gloom of overshadowed distances. On silvery sand-banks hippos and alligators sunned themselves side by side. The broadening waters flowed through a mob of wooded islands; you lost your way on that river as you would in a desert, and butted all day long against shoals, trying to find the channel, till you thought yourself bewitched and cut off for ever from everything you had known once - somewhere - far away - in another existence perhaps.',
          "There were moments when one's past came back to one, as it will sometimes when you have not a moment to spare to yourself; but it came in the shape of an unrestful and noisy dream, remembered with wonder amongst the overwhelming realities of this strange world of plants, and water, and silence.",
          'And this stillness of life did not in the least resemble a peace. It was the stillness of an implacable force brooding over an inscrutable intention. It looked at you with a vengeful aspect."'
        ]
      }
    ]
  },
  {
    id: 'walden',
    title: 'Walden',
    author: 'Henry David Thoreau',
    year: 1854,
    genre: 'Classic',
    pages: 352,
    about:
      'For two years, two months and two days Thoreau lived in a cabin he built himself on the shore of Walden Pond. Walden is the record - part journal, part economy, part argument that a person needs much less than they think to live deliberately.',
    audio: { narrator: 'Mel Foster', hours: 11 },
    chapters: [
      {
        title: 'Economy',
        paras: [
          'When I wrote the following pages, or rather the bulk of them, I lived alone, in the woods, a mile from any neighbor, in a house which I had built myself, on the shore of Walden Pond, in Concord, Massachusetts, and earned my living by the labor of my hands only. I lived there two years and two months. At present I am a sojourner in civilized life again.',
          'I should not obtrude my affairs so much on the notice of my readers if very particular inquiries had not been made by my townsmen concerning my mode of life, which some would call impertinent, though they do not appear to me at all impertinent, but, considering the circumstances, very natural and pertinent.',
          'Some have asked what I got to eat; if I did not feel lonesome; if I was not afraid; and the like. Others have been curious to learn what portion of my income I devoted to charitable purposes; and some, who have large families, how many poor children I maintained.',
          'I will therefore ask those of my readers who feel no particular interest in me to pardon me if I undertake to answer some of these questions in this book.',
          'In most books, the I, or first person, is omitted; in this it will be retained; that, in respect to egotism, is the main difference. We commonly do not remember that it is, after all, always the first person that is speaking. I should not talk so much about myself if there were anybody else whom I knew as well.',
          "Unfortunately, I am confined to this theme by the narrowness of my experience. Moreover, I, on my side, require of every writer, first or last, a simple and sincere account of his own life, and not merely what he has heard of other men's lives; some such account as he would send to his kindred from a distant land; for if he has lived sincerely, it must have been in a distant land to me."
        ]
      },
      {
        title: 'Economy (continued)',
        paras: [
          'I would fain say something, not so much concerning the Chinese and Sandwich Islanders as you who read these pages, who are said to live in New England; something about your condition, especially your outward condition or circumstances in this world, in this town, what it is, whether it is necessary that it be as bad as it is, whether it cannot be improved as well as not.',
          'I have travelled a good deal in Concord; and everywhere, in shops, and offices, and fields, the inhabitants have appeared to me to be doing penance in a thousand remarkable ways.',
          'I see young men, my townsmen, whose misfortune it is to have inherited farms, houses, barns, cattle, and farming tools; for these are more easily acquired than got rid of. Better if they had been born in the open pasture and suckled by a wolf, that they might have seen with clearer eyes what field they were called to labor in.',
          'Who made them serfs of the soil? Why should they eat their sixty acres, when man is condemned to eat only his peck of dirt? Why should they begin digging their graves as soon as they are born?',
          "But men labor under a mistake. The better part of the man is soon plowed into the soil for compost. By a seeming fate, commonly called necessity, they are employed, as it says in an old book, laying up treasures which moth and rust will corrupt and thieves break through and steal. It is a fool's life, as they will find when they get to the end of it, if not before."
        ]
      },
      {
        title: 'Where I Lived, and What I Lived For',
        paras: [
          'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.',
          'I did not wish to live what was not life, living is so dear; nor did I wish to practise resignation, unless it was quite necessary. I wanted to live deep and suck out all the marrow of life, to live so sturdily and Spartan-like as to put to rout all that was not life, to cut a broad swath and shave close, to drive life into a corner, and reduce it to its lowest terms, and, if it proved to be mean, why then to get the whole and genuine meanness of it, and publish its meanness to the world; or if it were sublime, to know it by experience, and be able to give a true account of it in my next excursion.',
          'For most men, it appears to me, are in a strange uncertainty about it, whether it is of the devil or of God, and have somewhat hastily concluded that it is the chief end of man here to "glorify God and enjoy him forever."',
          'Still we live meanly, like ants; though the fable tells us that we were long ago changed into men; like pygmies we fight with cranes; it is error upon error, and clout upon clout, and our best virtue has for its occasion a superfluous and evitable wretchedness.',
          'Our life is frittered away by detail. An honest man has hardly need to count more than his ten fingers, or in extreme cases he may add his ten toes, and lump the rest. Simplicity, simplicity, simplicity! I say, let your affairs be as two or three, and not a hundred or a thousand; instead of a million count half a dozen, and keep your accounts on your thumb-nail.'
        ]
      }
    ]
  }
]

export const byId = (id: string) => BOOKS.find((b) => b.id === id)!

/** The book flattened to reading order: one block per heading or paragraph. */
export type Block = { ch: number; kind: 'h' | 'p'; text: string }
export const blocks = (b: Book): Block[] =>
  b.chapters.flatMap((c, ch) => [
    { ch, kind: 'h' as const, text: c.title },
    ...c.paras.map((text) => ({ ch, kind: 'p' as const, text }))
  ])

/** First block index of each chapter, for the table of contents. */
export const chapterStarts = (b: Book) => {
  const out: number[] = []
  blocks(b).forEach((bl, i) => {
    if (bl.kind === 'h') out.push(i)
  })
  return out
}

export const audioLength = (b: Book) => b.audio && `${b.audio.hours} hr`
