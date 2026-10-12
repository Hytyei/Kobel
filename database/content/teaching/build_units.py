# Tactics Room curriculum. Every German string comes from Hadi's class notes.
# Run: python3 build_units.py -> writes units.json next to the other content (then validate_teaching.py)
import json, os

def talk(h, say, pts=None): return {"k":"talk","h":h,"say":say,**({"pts":pts} if pts else {})}
def words(h, say, items): return {"k":"words","h":h,"say":say,"items":items}
def table(h, say, rows, hi=None): return {"k":"table","h":h,"say":say,"rows":rows,"hi":hi or []}
def slots(h, say, rows): return {"k":"slots","h":h,"say":say,"rows":rows}
def dlg(h, say, lines): return {"k":"dlg","h":h,"say":say,"lines":lines}
def drill(q, opts, a, why, de=None): return {"k":"drill","h":"Quick check","q":q,"opts":opts,"a":a,"why":why,**({"de":de} if de else {})}
def order(q, ws, why): return {"k":"order","h":"Build the play","q":q,"words":ws,"why":why}
def recap(say, subject): return {"k":"recap","h":"Full time","say":say,"subject":subject}

U = []

# 1 ───────── Greetings
U.append({"id":"greet","md":1,"tag":"Kick-off","title":"Greetings & polite phrases","de":"Begrüßung","sub":"Say hello, goodbye and ask how someone is.","subject":"Greetings & polite phrases","boards":[
 talk("Kick-off!","Every match starts with a handshake. In German, every conversation starts with a greeting. Learn these first and you can walk onto the pitch.",["Pick the greeting by the time of day","Choose du-style (friends) or Sie-style (formal)"]),
 words("The greeting line-up","Four greetings, one for each part of the day. Tap a word to hear it.",[["Guten Morgen","good morning"],["Guten Tag","good day / hello"],["Guten Abend","good evening"],["Gute Nacht","good night"],["Hallo","hello"]]),
 words("Goodbyes","Two ways to leave the pitch. Informal with friends, formal with strangers and teachers.",[["Tschüs","bye"],["Mach's gut!","take care!"],["Auf Wiedersehen","goodbye (formal)"]]),
 slots("Two systems: du and Sie","Think of two formations. Friends play the informal system, strangers the formal one. Same question, different shape.",[
   {"line":"Informal (friends)","parts":[["Wie geht's dir?","How are you?"],["Und dir?","And you?"]]},
   {"line":"Formal (Sie)","parts":[["Wie geht es Ihnen?","How are you?"]]}]),
 words("How are you? Your answers","Pick an answer from the scale, from best to worst.",[["Super!","super"],["Sehr gut!","very good"],["Gut, danke.","good, thanks"],["Es geht.","so-so"],["Nicht so gut.","not so good"]]),
 dlg("Match tape: two friends","Listen first, then read. Tap Play and hear both players.",[["A","Hallo!","Hello!"],["B","Hallo! Wie geht's dir?","Hello! How are you?"],["A","Super! Und dir?","Super! And you?"],["B","Es geht.","So-so."],["A","Tschüs!","Bye!"],["B","Mach's gut!","Take care!"]]),
 dlg("Match tape: formal","Now the formal version, as with a teacher.",[["A","Guten Tag. Wie geht es Ihnen?","Good day. How are you?"],["B","Gut, danke. Und Ihnen?","Good, thanks. And you?"],["A","Sehr gut!","Very good!"],["B","Auf Wiedersehen.","Goodbye."]]),
 drill("A stranger, a teacher: which goodbye fits?",["Tschüs","Auf Wiedersehen","Hallo"],1,"Auf Wiedersehen is the formal goodbye. Tschüs is for friends.","Auf Wiedersehen"),
 drill("It is 9 in the morning. What do you say?",["Gute Nacht","Guten Abend","Guten Morgen"],2,"Morgen = morning. Gute Nacht is only when going to bed."),
 recap("Final whistle! You can start and end any conversation. Train these words now so they stick.","Greetings & polite phrases")]})

# 2 ───────── Classroom
U.append({"id":"class","md":2,"tag":"Warm-up","title":"Classroom & instructions","de":"Im Kurs","sub":"Understand your teacher and ask for help.","subject":"Classroom & instructions","boards":[
 talk("Warm-up drills","Before the real game, the coach shouts instructions. In class your teacher does the same. Learn to understand them and you never get lost.",["Instructions use Sie: Hören Sie.","The verb comes first, like a whistle"]),
 words("Six skills","These verbs are the basic training skills.",[["hören","to hear / listen"],["sprechen","to speak"],["lesen","to read"],["schreiben","to write"],["buchstabieren","to spell"],["wiederholen","to repeat"]]),
 words("Coach's commands","Your teacher gives orders. Each one starts with the verb and ends with Sie.",[["Hören Sie.","Listen."],["Sprechen Sie.","Speak."],["Lesen Sie.","Read."],["Schreiben Sie.","Write."],["Ergänzen Sie.","Complete."],["Kreuzen Sie an.","Tick the right answer."],["Ordnen Sie zu.","Match them up."]]),
 words("Help signals","When you are stuck, use these. A good player always asks.",[["Ich habe eine Frage.","I have a question."],["Wie bitte?","Pardon?"],["Darf ich raus?","May I go out?"],["Entschuldigung","excuse me / sorry"],["Kein Problem","no problem"]]),
 slots("The command formation","An instruction is short: the verb leads, Sie follows. Add a small word at the end if needed.",[
   {"line":"Verb + Sie","parts":[["Hören","verb","hi"],["Sie","you (formal)"]]},
   {"line":"Again","parts":[["Hören Sie","Listen"],["noch einmal","again"]]}]),
 dlg("Match tape: in class","A normal minute in the classroom.",[["A","Hören Sie. Sprechen Sie nach.","Listen. Repeat after the recording."],["B","Wie bitte?","Pardon?"],["A","Hören Sie noch einmal.","Listen again."],["B","Alles klar! Fertig!","All clear! Done!"],["B","Ich habe eine Frage.","I have a question."],["A","Ja. Kein Problem.","Yes. No problem."]]),
 drill("Your teacher says: Hören Sie noch einmal. What do you do?",["Listen again","Read again","Write again"],0,"hören = to listen, noch einmal = once more.","Hören Sie noch einmal."),
 drill("You did not understand. What do you say?",["Alles klar!","Wie bitte?","Fertig!"],1,"Wie bitte? means Pardon? Ask when you did not catch it."),
 recap("Training complete. You can follow every instruction in class. Now practise the words.","Classroom & instructions")]})

# 3 ───────── Sounds & articles
U.append({"id":"sounds","md":3,"tag":"Fitness","title":"Sounds & articles","de":"Laute & Artikel","sub":"German spelling sounds, and the three little words der, die, das.","subject":None,"covers":"Sounds & articles","boards":[
 talk("Fitness first","German is easier than it looks, because it is spelled as it sounds. A few sound rules and you can read any word.",["Learn 5 key sounds","Meet der, die, das"]),
 table("Five key sounds","Learn these sound patterns. Each one has an example from your notes.",[["sch","like sh in shoe (Entschuldigung)"],["tsch","like ch in chair (Deutschland)"],["ei","like i in mine (schreiben)"],["eu","like oy in boy (Deutschland)"],["ie","long ee (wiederholen)"]]),
 table("Tricky ones","Two more tricks that German players use all the time.",[["ch after a, o, u","hard, from the throat (Nacht, acht)"],["ch after other vowels","soft (Ich)"],["st / sp at the start","sounds like sht / shp (Starten)"],["-ig at the end","like -ich"]]),
 words("Listen and copy","Tap each word and say it back out loud.",[["Entschuldigung","excuse me"],["Deutschland","Germany"],["schreiben","to write"],["wiederholen","to repeat"],["starten","to start"],["acht","eight"]]),
 talk("Meet the three articles","Every German noun wears a shirt: der, die or das. This is the gender. There are no tricks to guess it, so always learn the noun with its article.",["der = masculine","die = feminine","das = neuter","die = all plurals"]),
 table("The squad sheet","Same word 'the', four shirts.",[["der","masculine (der Vater)"],["die","feminine (die Mutter)"],["das","neuter (das Kind)"],["die","plural (die Eltern)"]]),
 drill("Which shirt does Kind wear?",["der","die","das"],2,"das Kind. Always learn the article with the noun.","das Kind"),
 drill("What do ALL plurals wear?",["der","die","das"],1,"die: die Eltern, die Kinder. All plurals use die."),
 recap("You can now pronounce German and you know the three articles. Next time you meet a noun, grab its article too.", None)]})

# 4 ───────── Introductions
U.append({"id":"intro","md":4,"tag":"Team sheet","title":"Introductions & names","de":"Vorstellung","sub":"Say who you are and ask who someone is.","subject":"Introductions & names","boards":[
 talk("Team sheet","Every player gives his name before kick-off. Here is how you introduce yourself, and the two key verbs: sein and heißen.",["Ich heiße ... / Ich bin ... / Mein Name ist ...","Wer ist das? Das ist ..."]),
 words("Say your name","Three ways to say who you are. They mean the same.",[["Ich heiße ...","my name is ..."],["Ich bin ...","I am ..."],["Mein Name ist ...","my name is ..."]]),
 words("Ask the name","Same question, informal and formal. Remember: du for friends, Sie for strangers.",[["Wie heißt du?","what is your name? (informal)"],["Wie heißen Sie?","what is your name? (formal)"],["Wer ist das?","who is that?"],["Das ist ...","that is ..."]]),
 table("sein = to be","The most important verb in the squad. It is irregular, so learn it by heart.",[["ich","bin"],["du","bist"],["er/sie/es","ist"],["wir","sind"],["ihr","seid"],["sie/Sie","sind"]],[0,1,2]),
 table("heißen = to be called","Regular, with one trick: the stem ends in ß, so du only gets -t.",[["ich","heiße"],["du","heißt"],["er/sie/es","heißt"],["wir","heißen"],["ihr","heißt"],["sie/Sie","heißen"]],[1]),
 dlg("Match tape: meeting","Two new teammates meet.",[["A","Hallo! Wie heißt du?","Hello! What is your name?"],["B","Ich heiße Sina. Und du?","My name is Sina. And you?"],["A","Ich heiße Jan.","My name is Jan."],["B","Wer ist das?","Who is that?"],["A","Das ist Lydia.","That is Lydia."]]),
 dlg("Match tape: formal","At the front desk.",[["A","Guten Tag. Wie heißen Sie?","Good day. What is your name?"],["B","Mein Name ist Lydia.","My name is Lydia."]]),
 drill("Complete: Wie ___ du?",["heiße","heißt","heißen"],1,"du heißt. With du the verb ends in -t.","Wie heißt du?"),
 drill("Complete: Ich ___ Lydia.",["bist","ist","bin"],2,"ich bin. Learn the sein line-up: bin, bist, ist, sind, seid, sind."),
 recap("Now everyone knows who you are. Train this subject to lock it in.","Introductions & names")]})

# 5 ───────── Numbers
U.append({"id":"numbers","md":5,"tag":"Scoreboard","title":"Numbers","de":"Zahlen","sub":"Count from 0 to 100 and build any number in between.","subject":"Numbers","boards":[
 talk("The scoreboard","Football is numbers: scores, shirt numbers, minutes. Count 0 to 12 by heart, then German builds the rest with simple patterns.",["0-12: learn by heart","13-19: add -zehn","Tens: add -zig"]),
 words("0 to 12","The first twelve. No pattern, just learn them.",[["null","0"],["eins","1"],["zwei","2"],["drei","3"],["vier","4"],["fünf","5"],["sechs","6"],["sieben","7"],["acht","8"],["neun","9"],["zehn","10"],["elf","11"],["zwölf","12"]]),
 words("13 to 19","Easy pattern: unit + zehn.",[["dreizehn","13"],["vierzehn","14"],["fünfzehn","15"],["sechzehn","16"],["siebzehn","17"],["achtzehn","18"],["neunzehn","19"]]),
 words("The tens","Add -zig. Watch for the three rule-breakers.",[["zwanzig","20"],["dreißig","30"],["vierzig","40"],["fünfzig","50"],["sechzig","60"],["siebzig","70"],["achtzig","80"],["neunzig","90"],["hundert","100"]]),
 talk("Rule-breakers","Three tens bend the pattern. Dreißig uses ß instead of -zig. Sechzig drops the s of sechs. Siebzig drops the en of sieben.",["dreißig (ß)","sechzig (no s)","siebzig (no en)"]),
 slots("Backwards counting","For 21 to 99 German says the unit FIRST, then und, then the tens. Like a scoreline read backwards.",[
   {"line":"21","parts":[["ein","1"],["und","and"],["zwanzig","20","hi"]]},
   {"line":"35","parts":[["fünf","5"],["und","and"],["dreißig","30","hi"]]},
   {"line":"65","parts":[["fünf","5"],["und","and"],["sechzig","60","hi"]]}]),
 words("More examples","Say them out loud.",[["einundzwanzig","21"],["achtundzwanzig","28"],["zweiunddreißig","32"],["fünfunddreißig","35"],["dreiundvierzig","43"],["vierundfünfzig","54"],["fünfundsechzig","65"]]),
 drill("What is 28?",["zweiundachtzig","achtundzwanzig","achtzehn"],1,"Unit first: acht + und + zwanzig = 28.","achtundzwanzig"),
 drill("Which number is 16?",["sechzig","sechzehn","sechs"],1,"sechzehn = sechs without the s + zehn. Sechzig is 60."),
 recap("You can read any scoreboard now. Train the numbers to get fast.","Numbers")]})

# 6 ───────── Everyday verbs
U.append({"id":"verbs","md":6,"tag":"Training ground","title":"Everyday verbs","de":"Verben","sub":"Make regular verbs work with every player, plus haben.","subject":"Everyday verbs","boards":[
 talk("The training ground","Verbs are your players. They change their ending depending on who is playing. Learn one pattern and most verbs follow it.",["Take the stem (komm-)","Add the ending","Learn haben separately"]),
 words("Five everyday verbs","These will work in almost every conversation.",[["kommen","to come"],["wohnen","to live (reside)"],["lernen","to learn"],["gehen","to go"],["leben","to live"],["sagen","to say"]]),
 table("Regular endings","Take the stem, add the ending. kommen → komm- + ending.",[["ich","komme (-e)"],["du","kommst (-st)"],["er/sie/es","kommt (-t)"],["wir","kommen (-en)"],["ihr","kommt (-t)"],["sie/Sie","kommen (-en)"]],[0,1]),
 words("In real sentences","See the endings at work.",[["Ich komme aus Deutschland.","I come from Germany."],["Wo wohnst du?","Where do you live?"],["Warum lernst du Deutsch?","Why are you learning German?"],["Wohin gehst du?","Where are you going?"],["Ich lebe allein.","I live alone."]]),
 table("haben = to have","haben is irregular. Careful: er/sie/es is hat, not habt.",[["ich","habe"],["du","hast"],["er/sie/es","hat"],["wir","haben"],["ihr","habt"],["sie/Sie","haben"]],[1,2]),
 table("Stems ending in -t","When the stem ends in t, add an extra e so you can say it. arbeiten = to work.",[["ich","arbeite"],["du","arbeitest"],["er/sie/es","arbeitet"],["wir","arbeiten"],["ihr","arbeitet"],["sie/Sie","arbeiten"]],[1,2]),
 dlg("Match tape: getting to know you","A short chat using the new verbs.",[["A","Woher kommst du?","Where are you from?"],["B","Ich komme aus Österreich.","I come from Austria."],["A","Wo wohnst du?","Where do you live?"],["B","Ich wohne in Berlin.","I live in Berlin."],["A","Warum lernst du Deutsch?","Why are you learning German?"]]),
 drill("Complete: Du ___ eine Frage.",["habe","hast","hat"],1,"du hast. Ich habe, du hast, er hat.","Du hast eine Frage."),
 drill("Complete: Woher ___ du?",["komme","kommst","kommt"],1,"With du the ending is -st: du kommst."),
 recap("Now you can talk about what people do. Train the verbs next.","Everyday verbs")]})

# 7 ───────── Questions
U.append({"id":"questions","md":7,"tag":"Set pieces","title":"Questions","de":"Fragen","sub":"Ask anything with W-questions and yes/no questions.","subject":"Questions & answers","boards":[
 talk("Set pieces","A question is a set piece. There are only two types, and each has a fixed shape. Learn the shape and you can ask anything.",["W-Frage: starts with a question word","Ja/Nein-Frage: starts with the verb"]),
 words("The W-words","All W-questions start with W. Learn them as a group.",[["was","what"],["wer","who"],["wann","when"],["wo","where"],["woher","where from"],["wohin","where to"],["warum","why"],["wie","how"],["welche","which"],["wie viel","how much"],["wie viele","how many"]]),
 slots("Formation 1: W-Frage","Question word first. The verb is always player number 2.",[
   {"line":"Wo wohnst du?","parts":[["Wo","question word"],["wohnst","verb = position 2","hi"],["du","subject"]]},
   {"line":"Woher kommst du?","parts":[["Woher","question word"],["kommst","verb = position 2","hi"],["du","subject"]]},
   {"line":"Wer ist das?","parts":[["Wer","question word"],["ist","verb = position 2","hi"],["das","subject"]]}]),
 slots("Formation 2: Ja/Nein-Frage","No question word. The verb jumps to position 1 and the answer is ja or nein.",[
   {"line":"Ist das dein Vater?","parts":[["Ist","verb = position 1","hi"],["das","subject"],["dein Vater?","rest"]]},
   {"line":"Kommst du aus dem Iran?","parts":[["Kommst","verb = position 1","hi"],["du","subject"],["aus dem Iran?","rest"]]}]),
 dlg("Match tape: reporter","A short interview with questions of both types.",[["A","Wer ist das?","Who is that?"],["B","Das ist Jan.","That is Jan."],["A","Wie viele Bücher hast du?","How many books do you have?"],["B","Ich habe zwei Bücher.","I have two books."],["A","Wie viel kostet das?","How much does that cost?"]]),
 order("Put the words in order: Where do you live?",["Wo","wohnst","du"],"W-word first, then the verb in position 2, then the subject."),
 drill("Which one is a Ja/Nein-Frage?",["Wer ist das?","Ist das dein Vater?","Wo wohnst du?"],1,"It starts with the verb, so the answer is ja or nein."),
 drill("Where is the verb in a W-Frage?",["Position 1","Position 2","Last"],1,"Always position 2: Wo wohnst du?"),
 recap("You can now ask any question in the match. Train these question words.","Questions & answers")]})

# 8 ───────── Personal details
U.append({"id":"personal","md":8,"tag":"Player card","title":"Personal details","de":"Persönliche Daten","sub":"Age, family status, children and the words on a form.","subject":"Personal details","boards":[
 talk("The player card","A player card lists age, status and where he plays. A German form asks the same things. Here is the vocabulary.",["Age: Wie alt bist du?","Status: ledig, verheiratet ...","Children: Kinder"]),
 words("Ask the age","Three questions, three groups of people.",[["Wie alt bist du?","how old are you? (informal)"],["Wie alt sind Sie?","how old are you? (formal)"],["Wie alt seid ihr?","how old are you all?"],["Ich bin ... Jahre alt.","I am ... years old."]]),
 words("Family status","The word for the status box on the form is Familienstand.",[["ledig","single"],["verheiratet","married"],["verlobt","engaged"],["geschieden","divorced"],["verwitwet","widowed"]]),
 words("More words","Together or alone? With children?",[["zusammen","together"],["allein","alone"],["Ich habe ein Kind.","I have one child."],["Ich habe zwei Kinder.","I have two children."],["Ich habe keine Kinder.","I have no children."]]),
 words("Words on a form","Learn these to fill in an application.",[["Vorname","first name"],["Familienname","surname"],["Alter","age"],["Familienstand","marital status"],["Wohnort","place of residence"],["Herkunft","origin"],["Beruf","profession"]]),
 dlg("Match tape: at registration","Fill in the player card out loud.",[["A","Wie alt bist du?","How old are you?"],["B","Ich bin 28 Jahre alt.","I am 28 years old."],["A","Bist du verheiratet?","Are you married?"],["B","Nein, ich bin ledig.","No, I am single."],["A","Hast du Kinder?","Do you have children?"],["B","Ja, ich habe ein Kind.","Yes, I have one child."],["A","Wo wohnst du?","Where do you live?"],["B","Ich wohne in Hamburg. Ich lebe allein.","I live in Hamburg. I live alone."]]),
 drill("Which word means single (not married)?",["ledig","geschieden","verlobt"],0,"ledig = single. geschieden = divorced, verlobt = engaged."),
 drill("Which is the form field for your job?",["Wohnort","Beruf","Alter"],1,"Beruf = profession. Wohnort is your place of residence."),
 recap("Your player card is ready. Train the personal details.","Personal details")]})

# 9 ───────── Countries
U.append({"id":"countries","md":9,"tag":"Away fixtures","title":"Countries","de":"Länder","sub":"Say where you come from and where you live: aus and in.","subject":"Countries & languages","boards":[
 talk("Away fixtures","Where do you come from, and where do you play now? German uses two small words for that: aus for the origin, in for the present place.",["aus = origin","in = place where you are"]),
 words("The map","Most countries have no article.",[["Deutschland","Germany"],["Österreich","Austria"],["Frankreich","France"],["Italien","Italy"],["Schweden","Sweden"],["Spanien","Spain"],["China","China"],["England","England"],["Russland","Russia"],["Polen","Poland"],["Eritrea","Eritrea"]]),
 words("Countries with an article","These wear a shirt. After aus it changes: die → der, der → dem, plural → den.",[["die Türkei","Turkey"],["die Schweiz","Switzerland"],["die USA","the USA"],["der Iran","Iran"]]),
 slots("aus + country","Use aus with the origin. For countries with an article, take care of the shirt.",[
   {"line":"Ich komme aus Deutschland.","parts":[["Ich komme","I come"],["aus","from","hi"],["Deutschland","no article"]]},
   {"line":"Ich komme aus der Türkei.","parts":[["Ich komme","I come"],["aus der","die → der","hi"],["Türkei","feminine"]]},
   {"line":"Ich komme aus dem Iran.","parts":[["Ich komme","I come"],["aus dem","der → dem","hi"],["Iran","masculine"]]},
   {"line":"Ich komme aus den USA.","parts":[["Ich komme","I come"],["aus den","plural","hi"],["USA","plural"]]}]),
 slots("in = where you live now","Use in for the current place.",[
   {"line":"Ich wohne in München.","parts":[["Ich wohne","I live"],["in","in","hi"],["München","city"]]}]),
 dlg("Match tape: after the match","Two players from different countries chat.",[["A","Woher kommen Sie?","Where are you from?"],["B","Ich komme aus der Türkei. Und Sie?","I come from Turkey. And you?"],["A","Ich komme aus der Schweiz.","I come from Switzerland."],["B","Wo wohnen Sie?","Where do you live?"],["A","Ich wohne in München.","I live in Munich."]]),
 drill("Complete: Ich komme ___ Österreich.",["aus","in","bei"],0,"aus = origin. in is for where you live now.","Ich komme aus Österreich."),
 drill("Complete: Ich komme aus ___ Schweiz.",["die","der","dem"],1,"die Schweiz → aus der Schweiz."),
 recap("Passport checked. Train the countries now.","Countries & languages")]})

# 10 ───────── Jobs
U.append({"id":"jobs","md":10,"tag":"Careers","title":"Jobs & work","de":"Beruf","sub":"Ask and tell what you do, and make the feminine form.","subject":"Jobs & work","boards":[
 talk("Careers off the pitch","Even players have another job. Learn to say what you do for a living, and how male and female job titles work.",["Was machst du beruflich?","Ich arbeite als ... bei ..."]),
 words("Jobs, male and female","The female form usually adds -in. Sometimes an umlaut appears too.",[["der Lehrer","teacher (m.)"],["die Lehrerin","teacher (f.)"],["der Kellner","waiter"],["die Kellnerin","waitress"],["der Student","student (m.)"],["die Studentin","student (f.)"],["der Arzt","doctor (m.)"],["die Ärztin","doctor (f.)"]]),
 words("More jobs","Same -in pattern.",[["der Ingenieur","engineer"],["der Verkäufer","salesperson"],["der Journalist","journalist"],["der Architekt","architect"],["der Friseur","hairdresser"],["der Paketzusteller","delivery driver"],["die Krankenschwester","nurse (f.)"],["der Tierarzt","vet"]]),
 talk("The -in rule","Male job + -in = female job. Student → Studentin. Kellner → Kellnerin. Arzt → Ärztin (with an umlaut).",["+ -in","sometimes + umlaut"]),
 words("Ask and answer","Two questions, three ways to answer.",[["Was machst du beruflich?","what do you do? (informal)"],["Was machen Sie beruflich?","what do you do? (formal)"],["Ich bin ... von Beruf.","my profession is ..."],["Ich arbeite als ... bei ...","I work as ... at ..."]]),
 slots("als and bei","als = the role. bei = the employer.",[
   {"line":"Er arbeitet als Friseurin.","parts":[["Er arbeitet","he works"],["als","as","hi"],["Friseurin","role"]]},
   {"line":"Sie arbeitet bei HotSped.","parts":[["Sie arbeitet","she works"],["bei","at","hi"],["HotSped","employer"]]}]),
 words("Training and studying","Not working yet? Say it like this.",[["die Ausbildung","vocational training"],["das Praktikum","internship"],["studieren","to study (at university)"],["arbeitslos","unemployed"],["der Schüler","pupil"],["die Rentnerin","retiree (f.)"]]),
 dlg("Match tape: new teammate","Talking about jobs.",[["A","Was machst du beruflich?","What do you do for a living?"],["B","Ich bin Kellnerin. Und du?","I am a waitress. And you?"],["A","Ich studiere Medizin.","I study medicine."],["B","Wo arbeitest du?","Where do you work?"],["A","Ich arbeite bei HotSped.","I work at HotSped."]]),
 drill("Which is the female form of der Student?",["die Studentin","die Student","die Studenter"],0,"Add -in: die Studentin."),
 drill("Which word shows the employer?",["als","bei","nicht"],1,"bei HotSped = at HotSped. als is the role.","Sie arbeitet bei HotSped."),
 recap("Your career is clear. Train the job vocabulary.","Jobs & work")]})

# 11 ───────── Family
U.append({"id":"family","md":11,"tag":"The club family","title":"Family","de":"Familie","sub":"Name your family members and say mein / meine.","subject":"Family","boards":[
 talk("The club family","Every player has a family in the stands. Learn the family words, and the two small words mein and meine.",["Family words","mein / meine · dein / deine","Name + s"]),
 words("Parents and grandparents","Informal words in a second line.",[["der Vater","father"],["der Papa","dad"],["die Mutter","mother"],["die Mama","mum"],["die Eltern","parents"],["der Großvater","grandfather"],["der Opa","grandpa"],["die Großmutter","grandmother"],["die Oma","grandma"],["die Großeltern","grandparents"]]),
 words("Brothers, sisters, children","The close family.",[["der Bruder","brother"],["die Schwester","sister"],["die Geschwister","siblings"],["der Sohn","son"],["die Tochter","daughter"],["der Enkel","grandson"],["die Enkelin","granddaughter"]]),
 words("The wider squad","Uncles, aunts and partners.",[["der Onkel","uncle"],["die Tante","aunt"],["der Cousin","cousin (m.)"],["die Cousine","cousin (f.)"],["der Mann","husband / man"],["die Frau","wife / woman"]]),
 table("mein / meine","mein for der and das. meine for die and every plural. dein works the same way.",[["der Vater","mein Vater"],["das Kind","mein Kind"],["die Mutter","meine Mutter"],["die Eltern","meine Eltern"]],[0,2]),
 slots("Whose is it? Add -s","To say whose it is, add -s to the name. No apostrophe.",[
   {"line":"Jans Mutter","parts":[["Jan","name"],["+s","add -s","hi"],["Mutter","mother"]]},
   {"line":"Dorotheas Mann","parts":[["Dorothea","name"],["+s","add -s","hi"],["Mann","husband"]]}]),
 dlg("Match tape: the photo","Looking at family photos.",[["A","Ist das dein Bruder?","Is that your brother?"],["B","Nein, das ist mein Onkel Otto.","No, that is my uncle Otto."],["A","Und das? Ist das deine Oma?","And that? Is that your grandma?"],["B","Ja. Das ist meine Oma.","Yes. That is my grandma."],["A","Wer ist das?","Who is that?"],["B","Das ist meine Schwester Line.","That is my sister Line."]]),
 drill("Complete: Das ist ___ Schwester.",["mein","meine","meines"],1,"die Schwester → meine Schwester.","Das ist meine Schwester."),
 drill("Complete: Das ist ___ Vater.",["mein","meine","deine"],0,"der Vater → mein Vater."),
 recap("The family is in the stands. Train the family words.","Family")]})

# 12 ───────── ja/nein/doch
U.append({"id":"doch","md":12,"tag":"VAR check","title":"Answering: ja / nein / doch","de":"Antworten","sub":"The tricky little word doch.","subject":"Questions & answers","boards":[
 talk("The VAR check","With a normal question you say ja or nein. With a negative question German has a special word: doch. Think of it as a VAR override: the question says no, the truth is yes.",["Positive question: ja / nein","Negative question: doch / nein"]),
 table("Positive question","No nicht in the question. Ja means yes, nein means no.",[["Ist das dein Bruder?","Ja, das ist mein Bruder."],["Ist das dein Bruder?","Nein, das ist mein Onkel."]]),
 table("Negative question","The question has nicht, kein or oder? at the end. Doch means: yes, it IS so. Nein means: no, it is NOT so.",[["Wohnen deine Eltern nicht in Hamburg?","Doch, sie wohnen in Hamburg."],["Wohnen deine Eltern nicht in Hamburg?","Nein, sie wohnen in Berlin."]]),
 talk("Remember","Doch only answers a negative question and always means yes. Think: doch = 'on the contrary, yes'.",["+ question: ja / nein","- question: doch / nein"]),
 dlg("Match tape: the doubt","Ja, nein and doch in one chat.",[["A","Ist das deine Schwester?","Is that your sister?"],["B","Nein, das ist meine Tante.","No, that is my aunt."],["A","Wohnen deine Eltern nicht in Hamburg?","Don't your parents live in Hamburg?"],["B","Doch, sie wohnen in Hamburg.","Yes, they do."],["A","Leben Georg und Angela zusammen?","Do Georg and Angela live together?"],["B","Ja, sie leben zusammen.","Yes, they do."]]),
 drill("Ist Maren nicht geschieden? She IS divorced. Answer:",["Ja","Doch","Nein"],1,"A negative question and the answer is yes: Doch.","Doch, sie ist geschieden."),
 drill("Ist das dein Bruder? He is NOT your brother. Answer:",["Doch","Ja","Nein"],2,"A positive question and the answer is no: Nein."),
 recap("VAR approved. Train the questions and answers.","Questions & answers")]})

# 13 ───────── Noun genders
U.append({"id":"genders","md":13,"tag":"Tactics board","title":"Noun genders","de":"Genus-Regeln","sub":"Rules to guess der, die or das from the word.","subject":"Noun genders","boards":[
 talk("The tactics board","Most nouns have no logic. But many follow rules by ending or by category. These rules guess most of the squad correctly.",["der: categories","die: endings","das: endings"]),
 table("der: by category","Alcohol, car brands, times and weather are usually der.",[["Alcohol","der Gin, der Wodka (exception: das Bier)"],["Cars","der BMW, der Honda (exception: das Auto)"],["Time","der Tag, der Monat, der Januar, der Mittwoch, der Frühling"],["Weather","der Regen, der Schnee"]]),
 table("die: by ending","These endings are almost always die.",[["-eit","die Krankheit"],["-ung","die Ausbildung"],["-ion","die Information"],["-in","die Lehrerin"],["-e","die Tasche, die Batterie"],["Motorbikes","die Kawasaki"]]),
 table("das: by ending","These are das.",[["-chen","das Mädchen, das Brötchen"],["-lein","das Äuglein"],["-o","das Kino"],["Ge-","das Gemüse, das Gesicht"]]),
 talk("Exceptions","Every rule has exceptions. Times: die Woche, die Nacht, das Jahr. Weather: das Gewitter, die Sonne. Nouns in -e: der Name, der Buchstabe, das Auge, das Ende. -o: die Disko. Ge-: die Gesundheit, die Gebühr.",["Learn exceptions as separate words"]),
 drill("Which article: ___ Krankheit?",["der","die","das"],1,"-eit is always die: die Krankheit."),
 drill("Which article: ___ Mädchen?",["der","die","das"],2,"-chen is always das, even for a girl: das Mädchen."),
 drill("Which article: ___ Wodka?",["der","die","das"],0,"Alcohol is usually der: der Wodka."),
 recap("You can guess most genders now. Train them for real.","Noun genders")]})

# 14 ───────── Furniture
U.append({"id":"furniture","md":14,"tag":"Dressing room","title":"Furniture & home","de":"Möbel","sub":"Name the things in your home and the shop.","subject":"Furniture & home","boards":[
 talk("The dressing room","Look around the dressing room: table, chairs, lamp. These are the home words. Remember: learn each one with its article.",["der / die / das","Das ist ein ... / eine ..."]),
 words("Things at home","Tap each and look at its shirt.",[["das Sofa","sofa"],["der Tisch","table"],["der Stuhl","chair"],["der Sessel","armchair"],["der Schrank","cupboard"],["das Regal","shelf"],["das Bett","bed"],["der Teppich","carpet"]]),
 words("More","On the wall and in the room.",[["das Bild","picture"],["die Lampe","lamp"],["die Uhr","clock"],["die Tür","door"],["das Fenster","window"],["im Möbelgeschäft","in the furniture shop"]]),
 dlg("Match tape: what is that?","Name things in the room.",[["A","Was ist das?","What is that?"],["B","Das ist ein Tisch.","That is a table."],["A","Und das?","And that?"],["B","Das ist eine Lampe.","That is a lamp."],["A","Das Fenster ist groß.","The window is big."]]),
 drill("Which article: ___ Stuhl?",["der","die","das"],0,"der Stuhl."),
 drill("Which article: ___ Lampe?",["der","die","das"],1,"die Lampe: nouns in -e are mostly die."),
 recap("The dressing room is furnished. Train the furniture words.","Furniture & home")]})

# 15 ───────── Describing & prices
U.append({"id":"describe","md":15,"tag":"Transfer market","title":"Describing & prices","de":"Beschreiben","sub":"Adjectives, opinions, and asking the price.","subject":"Describing & prices","boards":[
 talk("The transfer market","At the transfer market you describe the player and ask the price. In a shop it is the same: adjectives, opinion and price.",["Adjectives come in opposites","Er / sie / es for things","Wie viel kostet ...?"]),
 words("Opposites","Learn them in pairs.",[["schön","beautiful"],["hässlich","ugly"],["teuer","expensive"],["günstig","cheap"],["groß","big"],["klein","small"],["alt","old"],["modern","modern"],["lang","long"],["kurz","short"]]),
 table("er / sie / es for things","A thing is replaced by the pronoun that matches its article.",[["der Stuhl","er"],["die Lampe","sie"],["das Bett","es"]],[0,1,2]),
 words("Give an opinion","Wie findest du ...? asks what you think. Ich finde ... gives your opinion.",[["Wie findest du das Bild?","what do you think of the picture?"],["Ich finde, das Bild ist teuer.","I think the picture is expensive."],["Das finde ich auch.","I agree."],["Das finde ich nicht.","I disagree."]]),
 words("Ask the price","Prices in euros.",[["Wie viel kostet er?","how much does it cost? (der)"],["Wie viel kostet sie?","(die)"],["Wie viel kostet es?","(das)"],["der Euro","euro"],["das Sonderangebot","special offer"]]),
 dlg("Match tape: in the shop","The whole shopping conversation.",[["A","Wir sind im Möbelgeschäft. Wie findest du das Bild?","We are in the furniture shop. What do you think of the picture?"],["B","Ich finde, das Bild ist teuer.","I think the picture is expensive."],["A","Das finde ich auch. Der Stuhl ist schön.","I agree. The chair is beautiful."],["B","Wie viel kostet er?","How much does it cost?"],["A","Der Stuhl kostet nur 59 Euro.","The chair costs only 59 euros."],["B","Oh, das ist aber günstig! Das ist ein Sonderangebot.","Oh, that is really cheap! That is a special offer."]]),
 drill("Which pronoun replaces die Lampe?",["er","sie","es"],1,"die → sie: Die Lampe ist schön. Sie ist schön."),
 drill("What is the opposite of teuer?",["günstig","groß","alt"],0,"teuer ↔ günstig / billig."),
 recap("Deal signed. Train the describing words.","Describing & prices")]})

# 16 ───────── Vowel change
U.append({"id":"vowel","md":16,"tag":"Advanced tactics","title":"Verbs with vowel change","de":"Verben mit Vokalwechsel","sub":"Verbs that change their vowel with du and er/sie/es.","subject":"Verbs with vowel change","boards":[
 talk("Advanced tactics","Some verbs swap their vowel in the du and er/sie/es forms. The other forms stay normal. Think of it as a player changing position in the middle.",["e → i","e → ie","a → ä"]),
 table("sprechen (e → i)","Only du and er/sie/es change.",[["ich","spreche"],["du","sprichst"],["er/sie/es","spricht"],["wir","sprechen"],["ihr","sprecht"],["sie/Sie","sprechen"]],[1,2]),
 table("nehmen (e → i, double m)","nehmen also doubles the m: nimmst, nimmt.",[["ich","nehme"],["du","nimmst"],["er/sie/es","nimmt"],["wir","nehmen"],["ihr","nehmt"],["sie/Sie","nehmen"]],[1,2]),
 table("lesen (e → ie)","lesen and sehen change to ie.",[["du","liest"],["er/sie/es","liest"]],[0,1]),
 table("schlafen (a → ä)","a becomes ä.",[["ich","schlafe"],["du","schläfst"],["er/sie/es","schläft"],["wir","schlafen"]],[1,2]),
 words("The squad of verbs","Learn them with their changing forms.",[["essen (du isst)","to eat"],["geben (du gibst)","to give"],["helfen (er hilft)","to help"],["sehen (du siehst)","to see"],["fahren (du fährst)","to drive"],["tragen (er trägt)","to carry / to wear"],["gehen","does NOT change"]]),
 words("In sentences","See them in action.",[["Du sprichst Englisch.","You speak English."],["Er nimmt den Stuhl.","He takes the chair."],["Du liest ein Buch.","You read a book."],["Du schläfst lange.","You sleep for a long time."],["Er hilft mir.","He helps me."]]),
 drill("Complete: Du ___ Englisch.",["sprechst","sprichst","sprecht"],1,"sprechen: du sprichst.","Du sprichst Englisch."),
 drill("Complete: Er ___ lange.",["schlafet","schläft","schlaft"],1,"schlafen: er schläft (a → ä)."),
 recap("You have the full tactics board. Train the changing verbs.","Verbs with vowel change")]})

# 17 ───────── Languages
U.append({"id":"languages","md":17,"tag":"Final","title":"Languages","de":"Sprachen","sub":"Say which languages you speak and how well.","subject":"Countries & languages","boards":[
 talk("The final","The last match of the season: languages. You can already say where you are from. Now say what you speak and how well.",["Ich spreche ...","Ich lerne ..."]),
 words("Languages","Language = country + -isch (mostly).",[["Deutsch","German"],["Englisch","English"],["Französisch","French"],["Italienisch","Italian"],["Spanisch","Spanish"],["Schwedisch","Swedish"],["Chinesisch","Chinese"],["Russisch","Russian"],["Polnisch","Polish"],["Türkisch","Turkish"],["Persisch","Persian"],["Aserbaidschanisch","Azerbaijani"]]),
 words("How well?","From best to worst.",[["sehr gut","very well"],["gut","well"],["ein bisschen","a little bit"],["gar nicht","not at all"]]),
 slots("Speak, learn, ask","Verb in position 2 again. Sprechen changes its vowel with du: du sprichst.",[
   {"line":"Ich spreche ein bisschen Türkisch.","parts":[["Ich","subject"],["spreche","verb = position 2","hi"],["ein bisschen Türkisch","rest"]]},
   {"line":"Welche Sprachen sprichst du?","parts":[["Welche Sprachen","question word"],["sprichst","verb = position 2","hi"],["du","subject"]]}]),
 dlg("Match tape: the press room","Two players, many languages.",[["A","Welche Sprachen sprichst du?","Which languages do you speak?"],["B","Ich spreche sehr gut Deutsch und ein bisschen Türkisch.","I speak German very well and a little Turkish."],["A","Sprichst du Persisch?","Do you speak Persian?"],["B","Ja. Und ich lerne Deutsch.","Yes. And I am learning German."],["A","Ich spreche gar nicht Chinesisch.","I do not speak Chinese at all."]]),
 drill("How do you say: I speak a little German?",["Ich spreche ein bisschen Deutsch.","Ich spreche gar nicht Deutsch.","Ich spreche sehr gut Deutsch."],0,"ein bisschen = a little bit.","Ich spreche ein bisschen Deutsch."),
 drill("Complete: Welche Sprachen ___ du?",["sprechen","sprichst","spreche"],1,"du sprichst: e → i."),
 recap("Champions! You have covered every lesson in the notes. Train the languages and keep the streak.","Countries & languages")]})

SPV={"sein = to be","heißen = to be called","haben = to have","Stems ending in -t","sprechen (e → i)","nehmen (e → i, double m)","lesen (e → ie)","schlafen (a → ä)","Regular endings"}  # SPV: verb tables are spoken row by row
for _u in U:
    for _b in _u["boards"]:
        if _b["k"]=="table" and _b["h"] in SPV: _b["sp"]="v"

if __name__=="__main__":
    out=os.path.dirname(os.path.abspath(__file__))
    os.makedirs(out,exist_ok=True)
    with open(os.path.join(out,"units.json"),"w",encoding="utf-8") as f:
        json.dump(U,f,ensure_ascii=False,indent=1)
    print("units",len(U),"boards",sum(len(u["boards"]) for u in U))
