/*!
 * EasyChatWidget embed script.
 *
 * This file is served exactly as we wrote it — unminified and fully commented —
 * so you can read and audit it before adding it to your site. It runs entirely
 * in the visitor's browser, is wrapped in error isolation so it can never break
 * the host page, and only talks to the EasyChatWidget API it was loaded from.
 *
 * Readable source of truth: resources/widget/widget.js
 */

(function cwBoot() {
  // Hard isolation: catch any unexpected runtime error so a bug on our side can
  // never disrupt the host page. On failure we log once, tear down any half-built
  // UI, and exit — the customer's site keeps running untouched. (Note: this cannot
  // catch a parse/syntax error in this file, but that too only disables the widget,
  // it can't stop the host page's own scripts.)
  try {
  // Capture our own <script> NOW, on the first synchronous execution, while
  // document.currentScript is valid AND the tag is still in the DOM. Some hosts
  // (Blogger home pages, certain CMS themes) STRIP or relocate injected <script>
  // tags shortly after load — so if we waited for a deferred callback to look it
  // up, querySelector would return null and the widget would silently never mount.
  // Holding the node reference (its attributes still read fine even when detached)
  // survives that removal. This is the Blogger "widget missing on the home page" fix.
  if (!cwBoot._script) {
    cwBoot._script = document.currentScript
      || document.querySelector('script[data-widget-id]')
      || document.querySelector('script[data-api-key]')
      || document.querySelector('script[src*="widget.js"]');
  }
  // Loaded with `async`, so we may execute before <body> is parsed (e.g. if the
  // snippet is placed in <head>). Defer until the DOM is ready so we can mount safely.
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', cwBoot, { once: true });
    return;
  }
  // Don't compete with the host page's own load work: wait for the browser to be
  // idle before building the widget. requestIdleCallback fires during a quiet gap
  // (with a timeout cap so the bubble still appears on perpetually-busy pages);
  // browsers without it fall back to running shortly after the load event.
  if (!cwBoot._deferred) {
    cwBoot._deferred = true;
    if (window.requestIdleCallback) {
      window.requestIdleCallback(cwBoot, { timeout: 4000 });
    } else if (document.readyState === 'complete') {
      setTimeout(cwBoot, 200);
    } else {
      window.addEventListener('load', function () { setTimeout(cwBoot, 200); }, { once: true });
    }
    return;
  }
  // Find our own <script> tag. document.currentScript works for the normal execution,
  // but is null when we run async from the DOMContentLoaded path above (a callback,
  // not script evaluation) — so fall back to locating the tag by its attributes.
  const script = cwBoot._script;
  if (!script) return;
  // Public widget identifier. Named data-widget-id in current embeds; older embeds
  // used data-api-key, so accept both so live installs never break.
  const apiKey = script.getAttribute('data-widget-id') || script.getAttribute('data-api-key');
  // API origin. An explicit data-api-url still wins (for self-hosted / custom API
  // hosts), but when it's absent we derive it from this script's own src — widget.js
  // is always served from our domain — so the embed snippet needs only data-widget-id.
  let apiBase = (script.getAttribute('data-api-url') || '').replace(/\/$/, '');
  if (!apiBase) {
    try { apiBase = new URL(script.src).origin; } catch (e) { apiBase = ''; }
  }

  // Embed-level page exclusions for owners who manage visibility by hand instead of
  // the dashboard's page-targeting: data-hide-on="/login,/register,/auth/*". This is
  // needed on SINGLE-PAGE APPS, where the script keeps running across client-side
  // routes — so simply leaving the embed off a page (e.g. auth pages) no longer hides
  // the widget there. Comma-separated glob paths, matched with the same engine as
  // page rules and re-checked on SPA navigation. Empty = no embed-level exclusions.
  const cwHidePaths = (script.getAttribute('data-hide-on') || '')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);

  if (!apiKey) {
    console.error('[ChatWidget] Missing data-widget-id attribute.');
    return;
  }

  let visitorId = localStorage.getItem('_cw_vid');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('_cw_vid', visitorId);
  }

  // ── i18n ──────────────────────────────────────────────────────────────────
  // Fixed UI chrome, translated to the widget's detected language. The dynamic
  // copy (welcome, teaser, suggested questions, AI replies) is already localized
  // server-side; these are the hard-coded strings the widget itself renders.
  // Hand-checked for the languages below; any other language falls back to en.
  const CW_I18N = {
    en: { send: 'Send', placeholder: 'Type a message…', poweredBy: 'Powered by', online: 'Online', typing: 'Typing…', connecting: 'Connecting…', title: 'Support', welcome: 'Hi! How can I help you?', greeting: 'Hi! 👋 How can I help you today?', leadPrompt: 'Want us to follow up? Leave your email.', leadEmail: 'you@email.com', leadThanks: "Thanks! We'll be in touch ✓", newChat: 'New conversation', expandView: 'Expand view', collapseView: 'Collapse view', minimize: 'Minimize chat', soundOn: 'Sound: On', soundOff: 'Sound: Off', connectingHuman: 'Connecting you to a human', listening: 'Listening…', reengage: ["Still there? I'm happy to help 👋", 'Have a question? Just ask me anything.', 'Need a hand finding something?', "I'm here whenever you're ready 💬"] },
    fr: { send: 'Envoyer', placeholder: 'Écrivez un message…', poweredBy: 'Propulsé par', online: 'En ligne', typing: 'En train d’écrire…', connecting: 'Connexion…', title: 'Assistance', welcome: 'Bonjour ! Comment puis-je vous aider ?', greeting: 'Bonjour ! 👋 Comment puis-je vous aider ?', leadPrompt: 'Vous souhaitez un suivi ? Laissez votre e-mail.', leadEmail: 'vous@email.com', leadThanks: 'Merci ! Nous vous recontactons ✓', newChat: 'Nouvelle conversation', expandView: 'Agrandir', collapseView: 'Réduire', minimize: 'Réduire le chat', soundOn: 'Son : activé', soundOff: 'Son : désactivé', connectingHuman: 'Mise en relation avec un conseiller', listening: 'Écoute…', reengage: ['Toujours là ? Je suis là pour aider 👋', 'Une question ? Demandez-moi ce que vous voulez.', 'Besoin d’aide pour trouver quelque chose ?', 'Je suis là dès que vous êtes prêt 💬'] },
    es: { send: 'Enviar', placeholder: 'Escribe un mensaje…', poweredBy: 'Con la tecnología de', online: 'En línea', typing: 'Escribiendo…', connecting: 'Conectando…', title: 'Soporte', welcome: '¡Hola! ¿En qué puedo ayudarte?', greeting: '¡Hola! 👋 ¿En qué puedo ayudarte hoy?', leadPrompt: '¿Quieres que te contactemos? Deja tu correo.', leadEmail: 'tu@email.com', leadThanks: '¡Gracias! Nos pondremos en contacto ✓', newChat: 'Nueva conversación', expandView: 'Ampliar', collapseView: 'Reducir', minimize: 'Minimizar chat', soundOn: 'Sonido: Activado', soundOff: 'Sonido: Desactivado', connectingHuman: 'Conectando con una persona', listening: 'Escuchando…', reengage: ['¿Sigues ahí? Estoy aquí para ayudar 👋', '¿Tienes una pregunta? Pregúntame lo que quieras.', '¿Necesitas ayuda para encontrar algo?', 'Aquí estoy cuando quieras 💬'] },
    de: { send: 'Senden', placeholder: 'Nachricht schreiben…', poweredBy: 'Bereitgestellt von', online: 'Online', typing: 'Schreibt…', connecting: 'Verbinden…', title: 'Support', welcome: 'Hallo! Wie kann ich helfen?', greeting: 'Hallo! 👋 Wie kann ich Ihnen heute helfen?', leadPrompt: 'Sollen wir uns melden? Hinterlassen Sie Ihre E-Mail.', leadEmail: 'sie@email.com', leadThanks: 'Danke! Wir melden uns ✓', newChat: 'Neue Unterhaltung', expandView: 'Vergrößern', collapseView: 'Verkleinern', minimize: 'Chat minimieren', soundOn: 'Ton: An', soundOff: 'Ton: Aus', connectingHuman: 'Verbindung zu einem Mitarbeiter', listening: 'Hört zu…', reengage: ['Noch da? Ich helfe gerne 👋', 'Eine Frage? Fragen Sie mich einfach.', 'Brauchen Sie Hilfe beim Finden?', 'Ich bin da, wenn Sie bereit sind 💬'] },
    pt: { send: 'Enviar', placeholder: 'Escreva uma mensagem…', poweredBy: 'Desenvolvido por', online: 'Online', typing: 'Digitando…', connecting: 'Conectando…', title: 'Suporte', welcome: 'Olá! Como posso ajudar?', greeting: 'Olá! 👋 Como posso ajudar hoje?', leadPrompt: 'Quer que entremos em contato? Deixe seu e-mail.', leadEmail: 'voce@email.com', leadThanks: 'Obrigado! Entraremos em contato ✓', newChat: 'Nova conversa', expandView: 'Ampliar', collapseView: 'Reduzir', minimize: 'Minimizar chat', soundOn: 'Som: Ligado', soundOff: 'Som: Desligado', connectingHuman: 'Conectando com um atendente', listening: 'Ouvindo…', reengage: ['Ainda aí? Estou aqui para ajudar 👋', 'Tem uma pergunta? É só perguntar.', 'Precisa de ajuda para encontrar algo?', 'Estou aqui quando você quiser 💬'] },
    it: { send: 'Invia', placeholder: 'Scrivi un messaggio…', poweredBy: 'Con tecnologia', online: 'Online', typing: 'Sta scrivendo…', connecting: 'Connessione…', title: 'Assistenza', welcome: 'Ciao! Come posso aiutarti?', greeting: 'Ciao! 👋 Come posso aiutarti oggi?', leadPrompt: 'Vuoi essere ricontattato? Lascia la tua email.', leadEmail: 'tu@email.com', leadThanks: 'Grazie! Ti contatteremo ✓', newChat: 'Nuova conversazione', expandView: 'Espandi', collapseView: 'Riduci', minimize: 'Riduci chat', soundOn: 'Audio: Attivo', soundOff: 'Audio: Disattivato', connectingHuman: 'Collegamento con un operatore', listening: 'In ascolto…', reengage: ['Ci sei ancora? Sono qui per aiutarti 👋', 'Hai una domanda? Chiedimi pure.', 'Ti serve aiuto per trovare qualcosa?', 'Sono qui quando vuoi 💬'] },
    nl: { send: 'Verzenden', placeholder: 'Typ een bericht…', poweredBy: 'Mogelijk gemaakt door', online: 'Online', typing: 'Aan het typen…', connecting: 'Verbinden…', title: 'Support', welcome: 'Hoi! Hoe kan ik je helpen?', greeting: 'Hoi! 👋 Hoe kan ik je vandaag helpen?', leadPrompt: 'Zullen we contact opnemen? Laat je e-mail achter.', leadEmail: 'jij@email.com', leadThanks: 'Bedankt! We nemen contact op ✓', newChat: 'Nieuw gesprek', expandView: 'Vergroten', collapseView: 'Verkleinen', minimize: 'Chat minimaliseren', soundOn: 'Geluid: Aan', soundOff: 'Geluid: Uit', connectingHuman: 'Verbinden met een medewerker', listening: 'Luisteren…', reengage: ['Ben je er nog? Ik help je graag 👋', 'Een vraag? Vraag me gerust iets.', 'Hulp nodig bij het vinden van iets?', 'Ik ben er wanneer je klaar bent 💬'] },
    ar: { send: 'إرسال', placeholder: 'اكتب رسالة…', poweredBy: 'مُشغّل بواسطة', online: 'متصل', typing: 'يكتب…', connecting: 'جارٍ الاتصال…', title: 'الدعم', welcome: 'مرحبًا! كيف يمكنني مساعدتك؟', greeting: 'مرحبًا! 👋 كيف يمكنني مساعدتك اليوم؟', leadPrompt: 'هل تريد أن نتواصل معك؟ اترك بريدك الإلكتروني.', leadEmail: 'you@email.com', leadThanks: 'شكرًا! سنتواصل معك قريبًا ✓', newChat: 'محادثة جديدة', expandView: 'تكبير', collapseView: 'تصغير', minimize: 'تصغير المحادثة', soundOn: 'الصوت: مفعّل', soundOff: 'الصوت: متوقف', connectingHuman: 'جارٍ توصيلك بموظف', listening: 'يستمع…', reengage: ['هل ما زلت هنا؟ يسعدني مساعدتك 👋', 'لديك سؤال؟ اسألني أي شيء.', 'تحتاج مساعدة في العثور على شيء؟', 'أنا هنا وقتما تكون جاهزًا 💬'] },
    tr: { send: 'Gönder', placeholder: 'Bir mesaj yazın…', poweredBy: 'Destekleyen', online: 'Çevrimiçi', typing: 'Yazıyor…', connecting: 'Bağlanıyor…', title: 'Destek', welcome: 'Merhaba! Size nasıl yardımcı olabilirim?', greeting: 'Merhaba! 👋 Bugün size nasıl yardımcı olabilirim?', leadPrompt: 'Sizinle iletişime geçelim mi? E-postanızı bırakın.', leadEmail: 'siz@email.com', leadThanks: 'Teşekkürler! Sizinle iletişime geçeceğiz ✓', newChat: 'Yeni sohbet', expandView: 'Genişlet', collapseView: 'Daralt', minimize: 'Sohbeti küçült', soundOn: 'Ses: Açık', soundOff: 'Ses: Kapalı', connectingHuman: 'Bir temsilciye bağlanıyor', listening: 'Dinliyor…', reengage: ['Orada mısınız? Yardımcı olmaktan memnuniyet duyarım 👋', 'Bir sorunuz mu var? Bana her şeyi sorabilirsiniz.', 'Bir şey bulmak için yardım ister misiniz?', 'Hazır olduğunuzda buradayım 💬'] },
    ru: { send: 'Отправить', placeholder: 'Введите сообщение…', poweredBy: 'Работает на', online: 'В сети', typing: 'Печатает…', connecting: 'Соединение…', title: 'Поддержка', welcome: 'Здравствуйте! Чем могу помочь?', greeting: 'Здравствуйте! 👋 Чем могу помочь сегодня?', leadPrompt: 'Хотите, чтобы мы связались с вами? Оставьте эл. почту.', leadEmail: 'you@email.com', leadThanks: 'Спасибо! Мы свяжемся с вами ✓', newChat: 'Новый диалог', expandView: 'Развернуть', collapseView: 'Свернуть', minimize: 'Свернуть чат', soundOn: 'Звук: Вкл', soundOff: 'Звук: Выкл', connectingHuman: 'Соединяем с оператором', listening: 'Слушаю…', reengage: ['Вы здесь? Рад помочь 👋', 'Есть вопрос? Спрашивайте о чём угодно.', 'Нужна помощь в поиске?', 'Я здесь, когда вы будете готовы 💬'] },
    pl: { send: 'Wyślij', placeholder: 'Napisz wiadomość…', poweredBy: 'Obsługiwane przez', online: 'Online', typing: 'Pisze…', connecting: 'Łączenie…', title: 'Pomoc', welcome: 'Cześć! Jak mogę pomóc?', greeting: 'Cześć! 👋 Jak mogę dziś pomóc?', leadPrompt: 'Chcesz, żebyśmy się odezwali? Zostaw swój e-mail.', leadEmail: 'ty@email.com', leadThanks: 'Dziękujemy! Odezwiemy się ✓', newChat: 'Nowa rozmowa', expandView: 'Powiększ', collapseView: 'Zmniejsz', minimize: 'Zminimalizuj czat', soundOn: 'Dźwięk: Wł.', soundOff: 'Dźwięk: Wył.', connectingHuman: 'Łączenie z konsultantem', listening: 'Słucham…', reengage: ['Jesteś tam? Chętnie pomogę 👋', 'Masz pytanie? Zapytaj o cokolwiek.', 'Potrzebujesz pomocy w znalezieniu czegoś?', 'Jestem tu, gdy będziesz gotowy 💬'] },
    zh: { send: '发送', placeholder: '输入消息…', poweredBy: '技术支持', online: '在线', typing: '正在输入…', connecting: '连接中…', title: '客服', welcome: '你好！有什么可以帮您？', greeting: '你好！👋 今天有什么可以帮您？', leadPrompt: '需要我们跟进吗？留下您的邮箱。', leadEmail: 'you@email.com', leadThanks: '谢谢！我们会与您联系 ✓', newChat: '新对话', expandView: '展开', collapseView: '收起', minimize: '最小化聊天', soundOn: '声音：开', soundOff: '声音：关', connectingHuman: '正在为您接通人工客服', listening: '正在聆听…', reengage: ['还在吗？我很乐意帮忙 👋', '有问题吗？尽管问我。', '需要帮您找点什么吗？', '您准备好了我随时都在 💬'] },
    ja: { send: '送信', placeholder: 'メッセージを入力…', poweredBy: '提供', online: 'オンライン', typing: '入力中…', connecting: '接続中…', title: 'サポート', welcome: 'こんにちは！ご用件をどうぞ。', greeting: 'こんにちは！👋 本日はどうされましたか？', leadPrompt: '折り返しご連絡しましょうか？メールをご記入ください。', leadEmail: 'you@email.com', leadThanks: 'ありがとうございます！ご連絡いたします ✓', newChat: '新しい会話', expandView: '拡大', collapseView: '縮小', minimize: 'チャットを最小化', soundOn: '音: オン', soundOff: '音: オフ', connectingHuman: '担当者におつなぎしています', listening: '聞き取り中…', reengage: ['まだいらっしゃいますか？喜んでお手伝いします 👋', 'ご質問はありますか？何でもお聞きください。', 'お探しのものはありますか？', '準備ができたらいつでもどうぞ 💬'] },
    ur: { send: 'بھیجیں', placeholder: 'پیغام لکھیں…', poweredBy: 'بذریعہ', online: 'آن لائن', typing: 'لکھ رہا ہے…', connecting: 'رابطہ ہو رہا ہے…', title: 'سپورٹ', welcome: 'سلام! میں آپ کی کیسے مدد کر سکتا ہوں؟', greeting: 'سلام! 👋 آج میں آپ کی کیسے مدد کر سکتا ہوں؟', leadPrompt: 'کیا آپ چاہتے ہیں کہ ہم رابطہ کریں؟ اپنا ای میل چھوڑ دیں۔', leadEmail: 'you@email.com', leadThanks: 'شکریہ! ہم آپ سے رابطہ کریں گے ✓', newChat: 'نئی گفتگو', expandView: 'بڑا کریں', collapseView: 'چھوٹا کریں', minimize: 'چیٹ چھوٹی کریں', soundOn: 'آواز: آن', soundOff: 'آواز: آف', connectingHuman: 'آپ کو نمائندے سے ملایا جا رہا ہے', listening: 'سن رہا ہے…', reengage: ['ابھی موجود ہیں؟ میں مدد کے لیے حاضر ہوں 👋', 'کوئی سوال ہے؟ مجھ سے کچھ بھی پوچھیں۔', 'کچھ ڈھونڈنے میں مدد چاہیے؟', 'جب آپ تیار ہوں میں یہیں ہوں 💬'] },
    fa: { send: 'ارسال', placeholder: 'پیام بنویسید…', poweredBy: 'قدرت‌گرفته از', online: 'آنلاین', typing: 'در حال نوشتن…', connecting: 'در حال اتصال…', title: 'پشتیبانی', welcome: 'سلام! چطور می‌توانم کمکتان کنم؟', greeting: 'سلام! 👋 امروز چطور می‌توانم کمکتان کنم؟', leadPrompt: 'می‌خواهید با شما تماس بگیریم؟ ایمیلتان را بگذارید.', leadEmail: 'you@email.com', leadThanks: 'ممنون! با شما در تماس خواهیم بود ✓', newChat: 'گفتگوی جدید', expandView: 'بزرگ‌نمایی', collapseView: 'کوچک‌نمایی', minimize: 'کوچک کردن گفتگو', soundOn: 'صدا: روشن', soundOff: 'صدا: خاموش', connectingHuman: 'در حال اتصال شما به یک همکار', listening: 'در حال شنیدن…', reengage: ['هنوز اینجا هستید؟ خوشحال می‌شوم کمک کنم 👋', 'سؤالی دارید؟ هر چیزی بپرسید.', 'برای پیدا کردن چیزی کمک می‌خواهید؟', 'هر وقت آماده بودید من اینجا هستم 💬'] },
    he: { send: 'שליחה', placeholder: 'כתבו הודעה…', poweredBy: 'מופעל על ידי', online: 'מחובר', typing: 'מקליד…', connecting: 'מתחבר…', title: 'תמיכה', welcome: 'שלום! איך אפשר לעזור?', greeting: 'שלום! 👋 איך אפשר לעזור היום?', leadPrompt: 'רוצים שנחזור אליכם? השאירו אימייל.', leadEmail: 'you@email.com', leadThanks: 'תודה! נחזור אליכם ✓', newChat: 'שיחה חדשה', expandView: 'הגדלה', collapseView: 'הקטנה', minimize: 'מזעור הצ׳אט', soundOn: 'צליל: פועל', soundOff: 'צליל: כבוי', connectingHuman: 'מחברים אתכם לנציג', listening: 'מקשיב…', reengage: ['עדיין כאן? אשמח לעזור 👋', 'יש שאלה? שאלו אותי כל דבר.', 'צריכים עזרה למצוא משהו?', 'אני כאן מתי שתהיו מוכנים 💬'] },
  };
  const CW_RTL = ['ar', 'he', 'fa', 'ur'];
  // Reassurance line under the "connecting you to a human" card. Kept separate
  // from CW_I18N so the main table stays one row per language.
  const CW_I18N_SUB = {
    en: 'Hang tight, an agent will be with you shortly.',
    fr: 'Un instant, un conseiller va vous répondre.',
    es: 'Un momento, un agente te atenderá enseguida.',
    de: 'Einen Moment, ein Mitarbeiter ist gleich für Sie da.',
    pt: 'Aguarde um momento, um atendente já vai falar com você.',
    it: 'Un attimo, un operatore sarà subito con te.',
    nl: 'Een moment, een medewerker helpt je zo.',
    ar: 'لحظة من فضلك، سيكون معك أحد الموظفين قريبًا.',
    tr: 'Lütfen bekleyin, bir temsilci birazdan sizinle olacak.',
    ru: 'Пожалуйста, подождите, оператор скоро подключится.',
    pl: 'Chwileczkę, konsultant zaraz się z Tobą połączy.',
    zh: '请稍候，客服马上就来。',
    ja: '少々お待ちください。担当者がまもなく対応します。',
    ur: 'براہ کرم انتظار کریں، ایک نمائندہ جلد آپ سے رابطہ کرے گا۔',
    fa: 'لطفاً کمی صبر کنید، یک همکار به‌زودی با شما خواهد بود.',
    he: 'רגע אחד, נציג יהיה איתכם בקרוב.',
  };
  function cwLang() {
    var l = ((configData && configData.language) || 'en').toString().toLowerCase().slice(0, 2);
    return CW_I18N[l] ? l : 'en';
  }
  function cwT(key) {
    var d = CW_I18N[cwLang()];
    return (d && d[key] != null) ? d[key] : CW_I18N.en[key];
  }
  // Onboarding stores the title as "{Brand} Support" with an English suffix,
  // regardless of the widget's language. On a non-English widget, swap just that
  // trailing " Support" for the localized word (e.g. "أكاديمية برمجة الدعم") so the
  // header reads naturally. No DB change — this fixes existing widgets at render.
  function cwLocalizeTitle(t) {
    t = (t == null ? '' : String(t)).trim();
    if (!t) return cwT('title');            // no custom title → localized default
    if (cwLang() === 'en') return t;
    var loc = cwT('title');
    if (!loc || loc === 'Support') return t; // no localized word for this language
    if (t === 'Support') return loc;
    if (t.length > 8 && t.slice(-8) === ' Support') return t.slice(0, -8) + ' ' + loc;
    return t;
  }
  // Localized "We run on" prefix for the default badge, so the EasyChatWidget
  // tagline reads naturally on non-English widgets instead of falling back to a
  // generic "Powered by". Mirrors the English default copy in Admin → Branding.
  const CW_RUNON = {
    en: 'We run on', fr: 'Fonctionne avec', es: 'Funciona con', de: 'Läuft mit',
    pt: 'Funciona com', it: 'Funziona con', nl: 'Draait op', ar: 'يعمل بواسطة',
    tr: 'Şununla çalışır', ru: 'Работает на', pl: 'Działa na', zh: '基于', ja: '搭載',
    ur: 'بذریعہ', fa: 'اجرا با', he: 'מופעל באמצעות',
  };
  function cwRunOn() { return CW_RUNON[cwLang()] || CW_RUNON.en; }
  // Localized "talk to a human" starter chip, always offered last in the
  // suggestions. Sent as a normal message — the AI recognizes the handoff intent
  // in any language (the <<HUMAN>> control token) and connects a person.
  const CW_ASKHUMAN = {
    en: 'Talk to a human', fr: 'Parler à un conseiller', es: 'Hablar con una persona',
    de: 'Mit einem Menschen sprechen', pt: 'Falar com um atendente', it: 'Parla con un operatore',
    nl: 'Met een medewerker praten', ar: 'التحدث إلى شخص حقيقي', tr: 'Bir yetkiliyle görüşmek istiyorum',
    ru: 'Связаться с человеком', pl: 'Porozmawiaj z człowiekiem', zh: '联系人工客服',
    ja: '担当者と話したい', ur: 'کسی نمائندے سے بات کریں', fa: 'گفتگو با پشتیبان انسانی',
    he: 'לדבר עם נציג',
  };
  function cwAskHuman() { return CW_ASKHUMAN[cwLang()] || CW_ASKHUMAN.en; }
  // Localized sender labels for the AI and a nameless human agent.
  const CW_AILABEL = {
    en: 'AI Assistant', fr: 'Assistant IA', es: 'Asistente IA', de: 'KI-Assistent',
    pt: 'Assistente de IA', it: 'Assistente IA', nl: 'AI-assistent', ar: 'المساعد الذكي',
    tr: 'Yapay Zeka Asistanı', ru: 'ИИ-ассистент', pl: 'Asystent AI', zh: 'AI 助手', ja: 'AIアシスタント',
    ur: 'اے آئی اسسٹنٹ', fa: 'دستیار هوش مصنوعی', he: 'עוזר AI',
  };
  const CW_AGENTLABEL = {
    en: 'Support Agent', fr: 'Conseiller', es: 'Agente de soporte', de: 'Support-Mitarbeiter',
    pt: 'Atendente', it: 'Operatore', nl: 'Supportmedewerker', ar: 'موظف الدعم',
    tr: 'Destek Temsilcisi', ru: 'Оператор поддержки', pl: 'Konsultant', zh: '客服', ja: 'サポート担当',
    ur: 'سپورٹ نمائندہ', fa: 'کارشناس پشتیبانی', he: 'נציג תמיכה',
  };
  // "You" — labels a quoted message that was sent by the visitor themselves.
  const CW_YOULABEL = {
    en: 'You', fr: 'Vous', es: 'Tú', de: 'Du', pt: 'Você', it: 'Tu', nl: 'Jij',
    ar: 'أنت', tr: 'Sen', ru: 'Вы', pl: 'Ty', zh: '你', ja: 'あなた',
    ur: 'آپ', fa: 'شما', he: 'אתה',
  };
  function cwAiLabel() { return CW_AILABEL[cwLang()] || CW_AILABEL.en; }
  function cwAgentLabel() { return CW_AGENTLABEL[cwLang()] || CW_AGENTLABEL.en; }
  function cwYouLabel() { return CW_YOULABEL[cwLang()] || CW_YOULABEL.en; }
  // Localized labels for the STANDARD lead-form fields, so a non-English widget
  // doesn't show "Name"/"Email" in English. Keyed by the field's `key`. Only used
  // when the merchant's label is still the English default (see cwFieldLabel), so
  // a custom label like "Full name" is never overwritten.
  const CW_FIELD_LABELS = {
    en: { name: 'Name', email: 'Email', phone: 'Phone', company: 'Company', message: 'Message' },
    fr: { name: 'Nom', email: 'E-mail', phone: 'Téléphone', company: 'Entreprise', message: 'Message' },
    es: { name: 'Nombre', email: 'Correo', phone: 'Teléfono', company: 'Empresa', message: 'Mensaje' },
    de: { name: 'Name', email: 'E-Mail', phone: 'Telefon', company: 'Firma', message: 'Nachricht' },
    pt: { name: 'Nome', email: 'E-mail', phone: 'Telefone', company: 'Empresa', message: 'Mensagem' },
    it: { name: 'Nome', email: 'Email', phone: 'Telefono', company: 'Azienda', message: 'Messaggio' },
    nl: { name: 'Naam', email: 'E-mail', phone: 'Telefoon', company: 'Bedrijf', message: 'Bericht' },
    ar: { name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف', company: 'الشركة', message: 'الرسالة' },
    tr: { name: 'Ad', email: 'E-posta', phone: 'Telefon', company: 'Şirket', message: 'Mesaj' },
    ru: { name: 'Имя', email: 'Эл. почта', phone: 'Телефон', company: 'Компания', message: 'Сообщение' },
    pl: { name: 'Imię', email: 'E-mail', phone: 'Telefon', company: 'Firma', message: 'Wiadomość' },
    zh: { name: '姓名', email: '邮箱', phone: '电话', company: '公司', message: '留言' },
    ja: { name: 'お名前', email: 'メール', phone: '電話番号', company: '会社名', message: 'メッセージ' },
    ur: { name: 'نام', email: 'ای میل', phone: 'فون', company: 'کمپنی', message: 'پیغام' },
    fa: { name: 'نام', email: 'ایمیل', phone: 'تلفن', company: 'شرکت', message: 'پیام' },
    he: { name: 'שם', email: 'אימייל', phone: 'טלפון', company: 'חברה', message: 'הודעה' },
  };
  // Localize a standard field's label, but only when it's still the English
  // default (so a merchant's deliberate custom label survives).
  function cwFieldLabel(f) {
    var en = CW_FIELD_LABELS.en, loc = CW_FIELD_LABELS[cwLang()];
    if (loc && f && f.key && en[f.key] && f.label === en[f.key]) return loc[f.key];
    return (f && f.label) || '';
  }
  // Lead prompt for an away hand-off — sets the expectation that leaving an email
  // means we reply BY email (which the backend does once the owner responds).
  const CW_LEADAWAY = {
    en: "We're away right now. Leave your email and we'll reply to you there.",
    fr: 'Nous sommes absents pour le moment. Laissez votre e-mail et nous vous répondrons par e-mail.',
    es: 'Ahora no estamos disponibles. Deja tu correo y te responderemos por email.',
    de: 'Wir sind gerade nicht da. Hinterlassen Sie Ihre E-Mail und wir antworten Ihnen per E-Mail.',
    pt: 'Estamos ausentes no momento. Deixe seu e-mail e responderemos por lá.',
    it: 'Al momento non ci siamo. Lascia la tua email e ti risponderemo lì.',
    nl: 'We zijn er nu even niet. Laat je e-mail achter, dan reageren we per e-mail.',
    ar: 'نحن غير متواجدين حاليًا. اترك بريدك الإلكتروني وسنرد عليك عبره.',
    tr: 'Şu anda müsait değiliz. E-postanızı bırakın, size e-posta ile yanıt verelim.',
    ru: 'Сейчас мы не в сети. Оставьте эл. почту, и мы ответим вам на неё.',
    pl: 'Jesteśmy teraz niedostępni. Zostaw e-mail, a odpowiemy Ci na niego.',
    zh: '我们当前不在线。留下您的邮箱，我们会通过邮件回复您。',
    ja: '現在オフラインです。メールアドレスを残していただければ、メールでご返信します。',
    ur: 'اس وقت ہم دستیاب نہیں ہیں۔ اپنا ای میل چھوڑ دیں، ہم وہیں جواب دیں گے۔',
    fa: 'در حال حاضر در دسترس نیستیم. ایمیلتان را بگذارید تا از همان طریق پاسخ دهیم.',
    he: 'אנחנו לא זמינים כרגע. השאירו אימייל ונחזור אליכם דרכו.',
  };
  function cwLeadAway() { return CW_LEADAWAY[cwLang()] || CW_LEADAWAY.en; }

  // ── Styles ──────────────────────────────────────────────────────────────────
  // --cw-color and --cw-color-dk are set dynamically after config loads
  const css = `
    #cw-panel, #cw-panel *, #cw-bubble, #cw-bubble *,
    #cw-greet, #cw-greet *, #cw-notif, #cw-notif *,
    #cw-connecting, #cw-connecting * { box-sizing: border-box; }
    #cw-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;
      width: 60px; height: 60px; border-radius: 50%;
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
      color: var(--cw-fg, #fff); border: none; cursor: pointer;
      box-shadow: 0 10px 28px -6px var(--cw-glow, rgba(79,70,229,.5)), 0 3px 8px rgba(2,6,23,.16);
      display: flex; align-items: center; justify-content: center;
      transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .25s, opacity .28s ease;
    }
    /* Hold the launcher hidden until branding resolves (from cache or the live
       config), so a first-time visitor never sees the default color flash to
       the site's brand color. The .cw-ready class fades it in, correctly tinted. */
    #cw-widget-root:not(.cw-ready) #cw-bubble { opacity: 0; transform: scale(.8); pointer-events: none; }
    #cw-bubble:hover { transform: scale(1.08); box-shadow: 0 14px 34px -6px var(--cw-glow, rgba(79,70,229,.6)), 0 4px 10px rgba(2,6,23,.2); }
    #cw-bubble:active { transform: scale(.94); }
    #cw-bubble svg {
      position: absolute; top: 50%; left: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px;
      transition: opacity .2s ease, transform .28s cubic-bezier(.34,1.56,.64,1);
    }
    #cw-bubble .cw-ic-close { opacity: 0; transform: rotate(-90deg) scale(.5); }
    #cw-bubble.cw-bubble-open .cw-ic-chat { opacity: 0; transform: rotate(90deg) scale(.5); }
    #cw-bubble.cw-bubble-open .cw-ic-close { opacity: 1; transform: rotate(0) scale(1); }
    /* "Online" presence dot — bottom-right of the launcher (standard presence spot) */
    #cw-online-dot {
      position: absolute; bottom: 2px; right: 2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #22c55e; border: 2.5px solid #fff;
      box-shadow: 0 1px 2px rgba(2,6,23,.22), 0 0 0 0 rgba(34,197,94,.5);
      animation: cwOnlinePulse 2.4s infinite;
      transition: opacity .2s ease, transform .2s ease;
    }
    @keyframes cwOnlinePulse {
      0%   { box-shadow: 0 1px 2px rgba(2,6,23,.22), 0 0 0 0 rgba(34,197,94,.5); }
      70%  { box-shadow: 0 1px 2px rgba(2,6,23,.22), 0 0 0 6px rgba(34,197,94,0); }
      100% { box-shadow: 0 1px 2px rgba(2,6,23,.22), 0 0 0 0 rgba(34,197,94,0); }
    }
    /* Hide it only while the chat is open (top-right badge no longer collides). */
    #cw-bubble.cw-bubble-open #cw-online-dot { opacity: 0; transform: scale(.4); }

    /* ── Orb launcher style: a glossy 3D sphere built from the brand color ── */
    #cw-bubble.cw-orb {
      background: radial-gradient(circle at 34% 28%,
        rgba(255,255,255,.95) 0%,
        var(--cw-color, #6366f1) 52%,
        var(--cw-color-dk, #4f46e5) 100%);
      box-shadow:
        0 12px 30px -6px var(--cw-glow, rgba(79,70,229,.55)),
        0 4px 10px rgba(2,6,23,.18),
        inset 0 -8px 16px -6px rgba(2,6,23,.35),
        inset 0 8px 14px -6px rgba(255,255,255,.7);
      animation: cwOrbFloat 5.5s ease-in-out infinite;
    }
    /* Specular highlight — the bright glassy glint near the top-left. */
    #cw-bubble.cw-orb::before {
      content: ''; position: absolute; top: 15%; left: 24%;
      width: 34%; height: 27%; border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 72%);
      pointer-events: none;
    }
    #cw-bubble.cw-orb:hover { animation-play-state: paused; }
    /* On the orb, dim the icon so the glossy sphere reads first (still legible). */
    #cw-bubble.cw-orb .cw-ic-chat { opacity: .82; }
    @keyframes cwOrbFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-5px); }
    }
    @media (prefers-reduced-motion: reduce) {
      #cw-bubble.cw-orb { animation: none; }
    }

    /* ── Squircle: a modern rounded-square launcher ───────────────────────── */
    #cw-bubble.cw-squircle { border-radius: 19px; }

    /* ── Glass: frosted, translucent glassmorphism (blurs page behind) ────── */
    #cw-bubble.cw-glass {
      background: var(--cw-glow-soft, rgba(99,102,241,.16));
      background-image: none;
      -webkit-backdrop-filter: blur(10px) saturate(1.5);
      backdrop-filter: blur(10px) saturate(1.5);
      border: 1px solid rgba(255,255,255,.4);
      color: var(--cw-color, #6366f1);
      box-shadow: 0 8px 26px -8px var(--cw-glow, rgba(79,70,229,.4)), inset 0 1px 1px rgba(255,255,255,.55);
    }

    /* ── Outline: minimal white button with a brand-colored ring ──────────── */
    #cw-bubble.cw-outline {
      background: #fff;
      background-image: none;
      border: 2.5px solid var(--cw-color, #6366f1);
      color: var(--cw-color, #6366f1);
      box-shadow: 0 8px 22px -8px var(--cw-glow, rgba(79,70,229,.4));
    }

    /* ── Halo: solid launcher with pulsing concentric rings ───────────────── */
    #cw-bubble.cw-halo::before, #cw-bubble.cw-halo::after {
      content: ''; position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid var(--cw-color, #6366f1);
      animation: cwHalo 2.4s ease-out infinite; pointer-events: none;
    }
    #cw-bubble.cw-halo::after { animation-delay: 1.2s; }
    @keyframes cwHalo {
      0%   { transform: scale(1);   opacity: .55; }
      100% { transform: scale(1.85); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      #cw-bubble.cw-halo::before, #cw-bubble.cw-halo::after { animation: none; opacity: 0; }
    }

    #cw-panel {
      position: fixed; bottom: 96px; right: 24px; z-index: 2147483647;
      width: 372px; max-width: calc(100vw - 48px);
      height: 540px; max-height: calc(100vh - 130px);
      background: #fff; color-scheme: light; border-radius: 18px;
      box-shadow: 0 18px 56px -12px rgba(2,6,23,.28), 0 6px 16px rgba(2,6,23,.08), 0 0 0 1px rgba(2,6,23,.04);
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(.92) translateY(14px); opacity: 0;
      transform-origin: bottom right;
      transition: transform .26s cubic-bezier(.16,1,.3,1), opacity .2s ease;
      pointer-events: none;
    }
    #cw-panel.cw-open {
      transform: scale(1) translateY(0); opacity: 1;
      pointer-events: all;
    }
    #cw-panel.cw-expanded {
      width: 440px; height: 660px; max-height: calc(100vh - 64px);
      transition: width .22s ease, height .22s ease;
    }

    #cw-header {
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
      color: var(--cw-fg, #fff); padding: 15px 16px; display: flex;
      align-items: center; gap: 11px;
    }
    #cw-header-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,.22); overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; box-shadow: 0 0 0 2px rgba(255,255,255,.25);
    }
    #cw-header-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    #cw-header-avatar svg { width: 20px; height: 20px; }
    #cw-header-text { flex: 1; min-width: 0; }
    #cw-header-title { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #cw-header-sub { font-size: 12px; opacity: .92; display: flex; align-items: center; gap: 6px; }
    .cw-status-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #34d399; flex-shrink: 0;
      box-shadow: 0 0 0 0 rgba(52,211,153,.6); animation: cwPulse 2s infinite;
    }
    @keyframes cwPulse {
      0%   { box-shadow: 0 0 0 0 rgba(52,211,153,.55); }
      70%  { box-shadow: 0 0 0 7px rgba(52,211,153,0); }
      100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
    }
    #cw-close, #cw-menu-btn {
      background: none; border: none; color: var(--cw-fg, #fff);
      cursor: pointer; padding: 4px; line-height: 0; border-radius: 8px;
      opacity: .85; transition: opacity .15s, background .15s;
    }
    #cw-close:hover, #cw-menu-btn:hover { opacity: 1; background: rgba(255,255,255,.15); }
    #cw-close svg { width: 20px; height: 20px; }
    #cw-menu-btn svg { width: 18px; height: 18px; }

    /* The widget isn't in a shadow DOM, so a host page's global "svg { stroke/fill }"
       rules can hijack our icons (e.g. turning the white header/launcher icons dark
       on a site that styles all SVGs). Re-assert our own stroke with an ID-scoped
       !important so the on-brand icons always follow --cw-fg. */
    #cw-bubble svg, #cw-bubble svg *,
    #cw-close svg, #cw-close svg *,
    #cw-menu-btn svg, #cw-menu-btn svg *,
    #cw-header-avatar-fb, #cw-header-avatar-fb * { stroke: currentColor !important; fill: none !important; }

    /* Same shadow-DOM-less hazard for the composer buttons: a host page that
       styles every <button> (e.g. "button { padding: 12px 17px; box-shadow: … }")
       leaks that padding in, and with the host's box-sizing:border-box it crushes
       our 20px icons down to a couple of pixels while the stray shadow paints a
       ghost disc. Re-assert our own box model so the icons always show. */
    #cw-emoji-btn, #cw-attach-btn, #cw-mic-btn, #cw-send {
      padding: 0 !important; box-sizing: border-box !important;
    }
    #cw-emoji-btn, #cw-attach-btn, #cw-mic-btn { box-shadow: none !important; }
    #cw-emoji-btn svg *, #cw-attach-btn svg *, #cw-mic-btn svg *,
    #cw-send svg * { stroke: currentColor !important; fill: none !important; }

    /* ── Host-CSS firewall ──────────────────────────────────────────────────
       We share the host page's DOM (no shadow root), so a site that styles bare
       <button>/<input>/<textarea>/<select> bleeds box-shadow, margin, background
       gradients and hover transforms into our controls — that is what puffed up
       the composer, the input capsule and the header dropdown on customer sites.
       Each selector is wrapped in :where() so it sits at plain ELEMENT
       specificity (0,0,1): it beats the host's bare-element rules by source
       order (our <style> is injected last) yet loses to every intended
       #cw-*/.cw-* rule below, so our own design (send-button glow, chip hover,
       brand gradients) stays exactly as authored. Scoped to #cw-widget-root, so
       it can NEVER touch the client's own page. This is the general fix; the
       element-specific rules above are belt-and-suspenders. */
    :where(#cw-widget-root) button,
    :where(#cw-widget-root) input,
    :where(#cw-widget-root) textarea,
    :where(#cw-widget-root) select {
      margin: 0; box-shadow: none; background-image: none;
    }
    :where(#cw-widget-root) button:hover { transform: none; }

    /* ── Typography: inherit the host page's font ────────────────────────────
       We deliberately follow the SITE's typeface rather than forcing our own. The
       decisive reason is non-Latin scripts: a forced system-ui stack renders Urdu
       (and similar) poorly, whereas the host site ships a font with the right
       glyphs. So we inherit the family (keeping our own sizes/weights + neutral
       metrics). Structural host-CSS resets below still protect the layout, and
       there's no text-align here so dir="rtl" for Arabic/Hebrew/Urdu still wins. */
    #cw-widget-root {
      font-family: inherit;
      font-size: 14px; line-height: 1.5; font-weight: 400; font-style: normal;
      letter-spacing: normal; word-spacing: normal; text-transform: none; text-shadow: none;
      -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    }
    /* Force every widget element to inherit the host font too — this overrides the
       widget's own hardcoded system-ui stacks so the whole thing follows the site
       consistently (sizes/weights are untouched; only the family changes). */
    #cw-widget-root, #cw-widget-root * { font-family: inherit !important; }
    /* Neutralize host bare-tag / universal rules that bleed into our nodes
       (margins, list bullets, link underlines, image filters, inherited metrics).
       0,0,1 specificity + injected-last order beats host bare-tag rules yet loses
       to our own #cw-*/.cw-* design rules, so the intended look is untouched. */
    :where(#cw-widget-root) div, :where(#cw-widget-root) p, :where(#cw-widget-root) span,
    :where(#cw-widget-root) a, :where(#cw-widget-root) li, :where(#cw-widget-root) ul,
    :where(#cw-widget-root) ol, :where(#cw-widget-root) h1, :where(#cw-widget-root) h2,
    :where(#cw-widget-root) h3, :where(#cw-widget-root) h4, :where(#cw-widget-root) label,
    :where(#cw-widget-root) strong, :where(#cw-widget-root) em, :where(#cw-widget-root) small,
    :where(#cw-widget-root) time, :where(#cw-widget-root) figure {
      font-family: inherit; line-height: inherit; letter-spacing: normal;
      text-transform: none; text-indent: 0; text-shadow: none;
      margin: 0; white-space: normal; float: none; word-spacing: normal;
    }
    :where(#cw-widget-root) ul, :where(#cw-widget-root) ol, :where(#cw-widget-root) li { list-style: none; padding: 0; }
    :where(#cw-widget-root) a { text-decoration: none; background: transparent; }
    :where(#cw-widget-root) p { padding: 0; }
    :where(#cw-widget-root) img { max-width: none; filter: none; border: 0; }

    #cw-menu {
      position: absolute; top: 56px; right: 12px; z-index: 6;
      background: #fff; border-radius: 12px; min-width: 196px; padding: 6px;
      box-shadow: 0 14px 36px -8px rgba(2,6,23,.3), 0 0 0 1px rgba(2,6,23,.06);
      animation: cwMenuIn .15s ease both; transform-origin: top right;
    }
    #cw-menu[hidden] { display: none; }
    @keyframes cwMenuIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .cw-menu-item {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 9px 10px; border: none; background: none; cursor: pointer;
      font: 500 13.5px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #0b1220; border-radius: 8px; text-align: left;
      transition: background .12s;
      /* Host sites that style every <button> otherwise leak a blue drop-shadow
         onto each row, banding the menu. Class specificity beats bare button. */
      box-shadow: none; background-image: none;
    }
    .cw-menu-item:hover { background: #f1f5f9; }
    .cw-menu-item svg { width: 16px; height: 16px; color: #64748b; flex-shrink: 0; }

    #cw-messages {
      flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 16px;
      display: flex; flex-direction: column; gap: 11px;
      font-size: 14px; line-height: 1.5; scroll-behavior: smooth;
      background: linear-gradient(180deg, #fafbfc, #fff 120px);
    }
    #cw-messages::-webkit-scrollbar { width: 5px; }
    #cw-messages::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    #cw-messages::-webkit-scrollbar-thumb:hover { background: #d1d5db; }

    .cw-msg {
      width: fit-content; max-width: 100%; padding: 10px 14px; border-radius: 18px;
      overflow-wrap: break-word; word-break: normal;
      box-shadow: 0 1px 2px rgba(2,6,23,.06);
    }
    .cw-msg.cw-user {
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
      color: var(--cw-fg, #fff); border-bottom-right-radius: 5px;
    }
    .cw-msg.cw-bot {
      background: #f3f4f6; color: #111827; border-bottom-left-radius: 5px;
    }
    .cw-msg.cw-bot ul { margin: 6px 0 2px 0; padding-inline-start: 20px; list-style: disc; }
    .cw-msg.cw-bot li { margin-bottom: 3px; list-style: disc; }
    .cw-msg.cw-bot strong { font-weight: 600; }
    .cw-msg.cw-bot code { background: #e5e7eb; border-radius: 4px; padding: 1px 5px; font-size: 12px; }
    .cw-msg.cw-bot pre { background: #1f2937; color: #f9fafb; border-radius: 8px; padding: 10px 12px; overflow-x: auto; margin: 6px 0; }
    .cw-msg.cw-bot pre code { background: none; padding: 0; font-size: 12px; }
    .cw-msg.cw-bot a { color: var(--cw-color, #6366f1); text-decoration: underline; word-break: break-all; }
    .cw-msg.cw-bot a:hover { opacity: .75; }
    .cw-table-wrap { margin: 8px 0; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; }
    .cw-table { border-collapse: collapse; width: 100%; font-size: 12.5px; line-height: 1.4; }
    .cw-table th, .cw-table td { border: 1px solid #e5e7eb; padding: 6px 9px; text-align: left; vertical-align: top; }
    .cw-table th { background: #f3f4f6; font-weight: 600; white-space: nowrap; }
    .cw-table tbody tr:nth-child(even) td { background: #fafbfc; }

    .cw-typing-dots { display: inline-flex; gap: 4px; align-items: center; padding: 3px 1px; }
    .cw-typing-dots span {
      width: 7px; height: 7px; border-radius: 50%; background: #9ca3af; display: inline-block;
      animation: cwBlink 1.2s infinite ease-in-out both;
    }
    .cw-typing-dots span:nth-child(2) { animation-delay: .18s; }
    .cw-typing-dots span:nth-child(3) { animation-delay: .36s; }
    @keyframes cwBlink { 0%, 80%, 100% { transform: scale(.6); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }

    .cw-sender-label { font-size: 11px; color: #9ca3af; margin-bottom: 3px; }
    .cw-time {
      font-size: 10.5px; color: #9ca3af; margin-top: 3px;
      opacity: 0; transition: opacity .15s ease; white-space: nowrap;
    }
    .cw-msg-wrap:hover .cw-time { opacity: 1; }

    .cw-msg-wrap {
      display: flex; flex-direction: column; max-width: 84%;
      animation: cwMsgIn .26s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes cwMsgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .cw-msg-wrap.cw-user-wrap { align-self: flex-end; align-items: flex-end; }
    .cw-msg-wrap.cw-bot-wrap  { align-self: flex-start; align-items: flex-start; gap: 2px; }
    .cw-bot-line { display: flex; align-items: flex-end; gap: 8px; max-width: 100%; }
    .cw-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; object-fit: cover;
      background: #e5e7eb; box-shadow: 0 1px 3px rgba(2,6,23,.14);
    }
    .cw-avatar-fb {
      display: flex; align-items: center; justify-content: center; color: var(--cw-fg, #fff);
      font: 700 13px/1 system-ui, sans-serif;
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
    }
    /* A human agent with no photo: mirror the header's person glyph, not the bot logo. */
    .cw-avatar-person {
      display: flex; align-items: center; justify-content: center;
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
    }
    .cw-avatar-person svg { width: 62%; height: 62%; stroke: var(--cw-fg, #fff); fill: none; }

    #cw-footer {
      padding: 12px 14px 14px; border-top: 1px solid #eef0f3; background: #fff;
    }
    /* "Powered by" badge — a subtle rounded pill with the real brand mark.
       Shown unless the owner's plan allows hiding it. */
    #cw-powered {
      margin: 9px 0 1px; text-align: center; line-height: 1;
    }
    #cw-powered a {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 500; color: #9aa3b2;
      text-decoration: none; letter-spacing: .005em;
      transition: color .16s ease, opacity .16s ease; opacity: .92;
    }
    #cw-powered a:hover { opacity: 1; color: #6b7280; }
    #cw-powered .cw-pb-logo {
      width: 16px; height: 16px; display: block; flex-shrink: 0; object-fit: contain;
      filter: grayscale(100%);
    }
    /* Badge reads: "<prefix> [logo] EasyChatWidget" — the mark sits right before
       the brand name (prefix / logo / name are three flex children in that order). */
    #cw-powered .cw-pb-pre { white-space: nowrap; }
    #cw-powered .cw-pb-name { font-weight: 700; color: #5b6472; }
    /* ── "Powered by" style variants (admin-selectable, pure CSS) ─────────────── */
    /* colored: keep the logo in colour and tint the brand name */
    #cw-powered.cw-pbs-colored a { color: #6b7280; opacity: 1; }
    #cw-powered.cw-pbs-colored .cw-pb-logo { filter: none; }
    #cw-powered.cw-pbs-colored .cw-pb-name { color: var(--cw-color, #6366f1); }
    /* bold: higher-contrast, always full opacity */
    #cw-powered.cw-pbs-bold a { color: #475569; opacity: 1; font-weight: 600; }
    #cw-powered.cw-pbs-bold .cw-pb-logo { filter: none; }
    #cw-powered.cw-pbs-bold .cw-pb-name { color: #0f172a; }
    /* pill: a filled, brand-tinted chip that stands out */
    #cw-powered.cw-pbs-pill a, #cw-powered.cw-pbs-glow a {
      padding: 4px 11px; border-radius: 999px; opacity: 1; font-weight: 600;
      background: var(--cw-glow-soft, rgba(99,102,241,.14));
      color: var(--cw-color, #6366f1);
    }
    #cw-powered.cw-pbs-pill .cw-pb-logo, #cw-powered.cw-pbs-glow .cw-pb-logo { filter: none; }
    #cw-powered.cw-pbs-pill .cw-pb-name, #cw-powered.cw-pbs-glow .cw-pb-name { color: var(--cw-color, #6366f1); }
    #cw-powered.cw-pbs-pill a:hover, #cw-powered.cw-pbs-glow a:hover { filter: brightness(.97); }
    /* glow: the pill plus a gentle pulse to draw the eye */
    #cw-powered.cw-pbs-glow a { animation: cwPbGlow 2.8s ease-in-out infinite; }
    @keyframes cwPbGlow {
      0%, 100% { box-shadow: 0 0 0 0 var(--cw-glow, rgba(99,102,241,.35)); }
      50%      { box-shadow: 0 0 0 5px transparent; }
    }
    @media (prefers-reduced-motion: reduce) { #cw-powered.cw-pbs-glow a { animation: none; } }
    /* Unified input capsule — emoji, text, mic and send live inside one surface. */
    #cw-input-wrap {
      position: relative;
      display: flex; align-items: flex-end; gap: 2px;
      background: #f4f5f7; border: 1.5px solid transparent; border-radius: 26px;
      padding: 4px 5px 4px 6px;
      box-shadow: inset 0 1px 2px rgba(2,6,23,.05);
      transition: background .18s ease, border-color .18s ease, box-shadow .2s ease;
    }
    /* Premium "listening" indicator — animated equalizer bars in the brand color. */
    #cw-listening {
      position: absolute; left: 46px; top: 50%; transform: translateY(-50%);
      display: none; align-items: center; gap: 9px; pointer-events: none;
      font: 500 14px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #8b93a3;
    }
    #cw-input-wrap.cw-listening #cw-listening { display: flex; }
    /* Hide the placeholder while recording so it doesn't overlap the "Listening…"
       indicator. -webkit-text-fill-color is required: on WebKit it overrides
       color, so color:transparent alone leaves the placeholder visible. */
    #cw-input-wrap.cw-listening #cw-input::placeholder { color: transparent; -webkit-text-fill-color: transparent; }
    .cw-eq { display: inline-flex; align-items: center; gap: 3px; height: 16px; }
    .cw-eq i {
      width: 3px; height: 100%; border-radius: 3px; transform-origin: center;
      background: var(--cw-color, #6366f1);
      animation: cwEq 1s infinite ease-in-out;
    }
    .cw-eq i:nth-child(2) { animation-delay: .18s; }
    .cw-eq i:nth-child(3) { animation-delay: .36s; }
    .cw-eq i:nth-child(4) { animation-delay: .54s; }
    @keyframes cwEq { 0%, 100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
    #cw-input-wrap:focus-within {
      background: #fff; border-color: rgba(2,6,23,.10);
      box-shadow: 0 0 0 3px var(--cw-glow-soft, rgba(99,102,241,.12)), 0 8px 22px -10px rgba(2,6,23,.18);
    }
    #cw-input {
      flex: 1; min-width: 0; border: none; background: transparent; resize: none;
      outline: none; font-family: inherit; font-size: 14px; line-height: 1.5;
      /* margin:0 is defensive: a host page that styles every textarea (e.g.
         "textarea { margin: 7px 0 15px }") otherwise leaks vertical margin in
         here and inflates the whole input capsule, since we're not shadow-DOM'd. */
      padding: 9px 6px; margin: 0; max-height: 120px; color: #0b1220; -webkit-text-fill-color: #0b1220;
      /* Grow with the text, then scroll instead of clipping the last line.
         border-box so the JS height = scrollHeight fits exactly (padding included). */
      box-sizing: border-box; overflow-y: auto; overscroll-behavior: contain;
    }
    /* The widget lives in the host page's DOM, so a host (or browser default)
       focus outline can paint a hard box on the textarea. Force it off — the
       single focus cue is the soft ring on #cw-input-wrap. */
    #cw-input:focus, #cw-input:focus-visible {
      outline: none !important; box-shadow: none !important; border: none !important;
    }
    #cw-input::placeholder { color: #9aa3b2; -webkit-text-fill-color: #9aa3b2; }
    #cw-send {
      width: 38px; height: 38px; border-radius: 50%;
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
      color: var(--cw-fg, #fff); border: none;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; margin-left: 2px;
      transition: transform .14s cubic-bezier(.34,1.56,.64,1), opacity .15s, box-shadow .15s;
      box-shadow: 0 3px 10px -2px var(--cw-glow, rgba(79,70,229,.5));
    }
    #cw-send:hover { box-shadow: 0 5px 14px -2px var(--cw-glow, rgba(79,70,229,.62)); }
    #cw-send:active { transform: scale(.86); }
    #cw-send svg { width: 18px; height: 18px; transition: transform .15s; }
    /* Empty input → calm, recessed send; text present → vibrant, lifted. */
    #cw-input-wrap:not(.cw-has-text) #cw-send {
      background-image: none; background: #d8dbe2; color: #fff;
      box-shadow: none; transform: scale(.94);
    }
    #cw-input-wrap:not(.cw-has-text) #cw-send svg { transform: rotate(0); }

    #cw-emoji-btn, #cw-mic-btn, #cw-attach-btn {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: none; border: none; cursor: pointer; color: #98a1af;
      display: flex; align-items: center; justify-content: center;
      transition: color .15s, background .15s, transform .12s;
    }
    #cw-emoji-btn[hidden], #cw-mic-btn[hidden], #cw-attach-btn[hidden] { display: none; }
    #cw-emoji-btn:hover, #cw-mic-btn:hover, #cw-attach-btn:hover { color: var(--cw-color, #6366f1); background: rgba(2,6,23,.05); }
    #cw-emoji-btn:active, #cw-mic-btn:active, #cw-attach-btn:active { transform: scale(.9); }
    #cw-emoji-btn svg, #cw-mic-btn svg, #cw-attach-btn svg { width: 20px; height: 20px; }

    /* --- attachments --- */
    /* Bottom padding matters: without it the thumbnail sits flush against the
       input pill. Left padding lines the chip up with the emoji button. */
    #cw-attach-strip { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 10px 10px; }
    #cw-attach-strip[hidden] { display: none; }
    .cw-att-chip {
      position: relative; width: 56px; height: 56px; border-radius: 10px;
      overflow: hidden; flex-shrink: 0; border: 1px solid rgba(2,6,23,.10);
      background: #f1f5f9; display: flex; align-items: center; justify-content: center;
    }
    .cw-att-chip img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cw-att-chip.cw-att-pdf { font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: .04em; }
    .cw-att-chip.cw-att-busy img { opacity: .45; }
    .cw-att-spin {
      position: absolute; width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid rgba(2,6,23,.15); border-top-color: var(--cw-color, #6366f1);
      animation: cw-att-rot .7s linear infinite;
    }
    @keyframes cw-att-rot { to { transform: rotate(360deg); } }

    /* Upload progress. Two honest phases: the bar tracks real bytes on the wire,
       then it flips to the spinner while the server reads the file — otherwise it
       would sit at 100% looking stalled. */
    .cw-att-bar {
      position: absolute; left: 4px; right: 4px; bottom: 4px; height: 3px;
      border-radius: 2px; background: rgba(255,255,255,.5); overflow: hidden;
    }
    .cw-att-bar i {
      display: block; height: 100%; width: 0%; border-radius: 2px;
      background: var(--cw-color, #6366f1); transition: width .15s linear;
    }
    .cw-att-pct {
      position: absolute; top: 3px; left: 4px; font-size: 9px; font-weight: 700;
      color: #fff; text-shadow: 0 1px 2px rgba(2,6,23,.6); letter-spacing: .02em;
    }

    /* Drag and drop: the standard pattern — a dimmed panel with an inset dashed
       box, an upload icon and a label. Familiar beats clever here; people have
       seen this exact shape everywhere and know instantly what to do. */
    #cw-drop {
      position: absolute; inset: 0; z-index: 30;
      border-radius: 18px; pointer-events: none; padding: 10px;
      background: rgba(255,255,255,.95);
      animation: cw-drop-fade .12s ease-out;
    }
    #cw-drop[hidden] { display: none; }
    @keyframes cw-drop-fade { from { opacity: 0; } to { opacity: 1; } }

    #cw-drop-box {
      width: 100%; height: 100%; box-sizing: border-box;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      border: 2px dashed var(--cw-color, #6366f1);
      border-radius: 12px;
      background: var(--cw-glow-soft, rgba(99,102,241,.06));
    }
    #cw-drop-box svg { width: 30px; height: 30px; color: var(--cw-color, #6366f1); }
    #cw-drop-title { font-size: 13px; font-weight: 600; color: var(--cw-color, #6366f1); }
    #cw-drop-sub { font-size: 11px; color: #64748b; }
    .cw-att-x {
      position: absolute; top: 2px; right: 2px; width: 16px; height: 16px;
      border-radius: 50%; border: none; cursor: pointer; padding: 0;
      background: rgba(2,6,23,.65); color: #fff; font-size: 11px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .cw-att-x:hover { background: rgba(2,6,23,.85); }
    .cw-msg-atts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .cw-msg-atts:last-child { margin-bottom: 0; }
    .cw-msg-att {
      display: block; max-width: 200px; min-height: 40px; border-radius: 10px;
      overflow: hidden; text-decoration: none; cursor: zoom-in;
      padding: 0; border: 1px solid rgba(255,255,255,.25);
      /* Placeholder box so a still-loading image reserves space instead of
         collapsing to nothing and popping the layout when it arrives. */
      background: rgba(2,6,23,.06);
      transition: opacity .15s;
    }
    .cw-msg-att:hover { opacity: .9; }
    .cw-msg-att img { display: block; width: 100%; height: auto; max-height: 220px; object-fit: cover; }
    .cw-msg-file {
      display: flex; align-items: center; gap: 6px; padding: 7px 10px;
      border-radius: 10px; background: rgba(2,6,23,.06); color: inherit;
      font-size: 12px; text-decoration: none; max-width: 220px;
    }
    .cw-msg-file:hover { background: rgba(2,6,23,.12); }
    .cw-msg-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* --- image viewer (tap a photo to see it full size) --- */
    #cw-lightbox {
      position: absolute; inset: 0; z-index: 40; display: flex; flex-direction: column;
      background: rgba(2,6,23,.92); animation: cw-lb-in .12s ease-out;
    }
    #cw-lightbox[hidden] { display: none; }
    @keyframes cw-lb-in { from { opacity: 0; } to { opacity: 1; } }
    #cw-lb-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 10px 12px; color: rgba(255,255,255,.9); flex-shrink: 0;
    }
    #cw-lb-name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cw-lb-btn {
      width: 32px; height: 32px; border-radius: 50%; border: none; background: none;
      color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; text-decoration: none; transition: background .15s;
    }
    .cw-lb-btn:hover { background: rgba(255,255,255,.15); }
    .cw-lb-btn svg { width: 18px; height: 18px; }
    #cw-lb-stage {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 0 12px 12px; min-height: 0;
    }
    #cw-lb-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
    #cw-emoji-btn.cw-active { color: var(--cw-color, #6366f1); background: var(--cw-glow-soft, rgba(99,102,241,.15)); }
    #cw-mic-btn.cw-recording {
      color: #fff; background: #ef4444;
      animation: cwMicPulse 1.4s infinite;
    }
    @keyframes cwMicPulse {
      0% { box-shadow: 0 0 0 0 rgba(239,68,68,.5); }
      70% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }

    #cw-emoji-panel {
      position: absolute; left: 14px; right: 14px; bottom: 80px; z-index: 6;
      background: #fff; border-radius: 14px; padding: 8px;
      box-shadow: 0 14px 36px -8px rgba(2,6,23,.28), 0 0 0 1px rgba(2,6,23,.06);
      max-height: 188px; overflow-y: auto;
      display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px;
      animation: cwMenuIn .15s ease both; transform-origin: bottom center;
    }
    #cw-emoji-panel[hidden] { display: none; }
    .cw-emoji {
      border: none; background: none; cursor: pointer; font-size: 20px;
      line-height: 1; padding: 5px 0; border-radius: 8px; transition: background .1s, transform .1s;
      /* Kill the host's bare-<button> blue drop-shadow: on this tight grid each
         cell's blurred shadow bleeds under its neighbours and washes the panel. */
      box-shadow: none; background-image: none;
    }
    .cw-emoji:hover { background: #f1f5f9; transform: scale(1.15); }

    .cw-suggestions {
      display: flex; flex-direction: column; gap: 8px; margin-top: 8px;
      align-self: flex-start; align-items: flex-start;
      margin-left: 36px; max-width: calc(100% - 36px);
    }
    .cw-chip {
      padding: 9px 14px; border-radius: 16px; border-bottom-left-radius: 5px;
      border: 1.5px solid var(--cw-glow, rgba(99,102,241,.4));
      background: #fff; color: var(--cw-ink, #6366f1);
      font-size: 13.5px; font-family: inherit; line-height: 1.35;
      cursor: pointer; text-align: left;
      box-shadow: 0 1px 3px rgba(2,6,23,.06);
      transition: transform .12s ease, box-shadow .15s, border-color .15s;
    }
    .cw-chip:hover { transform: translateY(-1px); box-shadow: 0 5px 14px -3px rgba(2,6,23,.14); border-color: var(--cw-color, #6366f1); }
    .cw-chip:active { transform: translateY(0) scale(.99); }

    /* ── Proactive greeting card ─────────────────────────────────────────── */
    #cw-greet {
      position: fixed; bottom: 96px; right: 24px; z-index: 2147483645;
      width: 304px; max-width: calc(100vw - 48px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 18px 48px -12px rgba(2,6,23,.28), 0 4px 12px rgba(2,6,23,.08), 0 0 0 1px rgba(2,6,23,.04);
      padding: 14px 14px 13px; color: #0b1220;
      font: 400 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      animation: cwGreetIn .4s cubic-bezier(.16,1,.3,1) both;
      transform-origin: bottom right;
    }
    @keyframes cwGreetIn { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    #cw-greet.cw-greet-out { animation: cwGreetOut .22s ease forwards; }
    @keyframes cwGreetOut { to { opacity: 0; transform: translateY(8px) scale(.97); } }
    #cw-greet-x {
      position: absolute; top: 8px; right: 9px; border: none; background: transparent;
      color: #9ca3af; font-size: 18px; line-height: 1; cursor: pointer; padding: 2px 4px; border-radius: 7px;
      transition: background .15s, color .15s;
    }
    #cw-greet-x:hover { background: #f1f5f9; color: #475569; }
    .cw-greet-head { display: flex; align-items: center; gap: 9px; margin-bottom: 9px; padding-right: 16px; }
    .cw-greet-av { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 1px 3px rgba(2,6,23,.14); }
    .cw-greet-fb {
      display: flex; align-items: center; justify-content: center; color: var(--cw-fg, #fff); font: 700 13px/1 system-ui, sans-serif;
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
    }
    .cw-greet-name { font-weight: 600; font-size: 13.5px; line-height: 1.25; }
    .cw-greet-name small { display: flex; align-items: center; gap: 5px; font-weight: 500; font-size: 11px; color: #16a34a; margin-top: 1px; }
    .cw-greet-name small::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #34d399; }
    .cw-greet-body { cursor: pointer; }
    .cw-greet-bubble {
      background: #f3f4f6; color: #111827; border-radius: 14px; border-bottom-left-radius: 5px;
      padding: 10px 13px; display: inline-block; max-width: 100%; overflow-wrap: break-word;
    }
    .cw-greet-chips { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; animation: cwGreetIn .3s ease both; }
    .cw-greet-chip {
      text-align: left; border: 1.5px solid var(--cw-color, #6366f1); background: #fff; color: var(--cw-ink, #6366f1);
      border-radius: 12px; padding: 8px 12px; font: 600 13px system-ui, sans-serif; cursor: pointer;
      transition: background .15s, color .15s, transform .1s;
    }
    .cw-greet-chip:hover { background: var(--cw-color, #6366f1); color: var(--cw-fg, #fff); }
    .cw-greet-chip:active { transform: scale(.98); }

    /* ── Incoming-reply notification popover ─────────────────────────────── */
    #cw-notif {
      position: fixed; bottom: 96px; right: 24px; z-index: 2147483645;
      width: 304px; max-width: calc(100vw - 48px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 18px 48px -12px rgba(2,6,23,.28), 0 4px 12px rgba(2,6,23,.08), 0 0 0 1px rgba(2,6,23,.04);
      padding: 13px 14px 14px; color: #0b1220; cursor: pointer;
      font: 400 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      animation: cwGreetIn .4s cubic-bezier(.16,1,.3,1) both;
      transform-origin: bottom right;
    }
    #cw-notif:hover { box-shadow: 0 22px 54px -12px rgba(2,6,23,.32), 0 6px 14px rgba(2,6,23,.1), 0 0 0 1px rgba(2,6,23,.05); }
    #cw-notif.cw-greet-out { animation: cwGreetOut .22s ease forwards; }
    #cw-notif-x {
      position: absolute; top: 8px; right: 9px; border: none; background: transparent;
      color: #9ca3af; font-size: 18px; line-height: 1; cursor: pointer; padding: 2px 4px; border-radius: 7px;
      transition: background .15s, color .15s;
    }
    #cw-notif-x:hover { background: #f1f5f9; color: #475569; }
    .cw-notif-head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; padding-right: 16px; }
    .cw-notif-name { font-weight: 600; font-size: 13.5px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cw-notif-name small { display: flex; align-items: center; gap: 5px; font-weight: 500; font-size: 11px; color: #16a34a; margin-top: 1px; }
    .cw-notif-name small::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #34d399; }
    .cw-notif-msg {
      background: #f3f4f6; color: #111827; border-radius: 14px; border-bottom-left-radius: 5px;
      padding: 10px 13px; font-size: 13.5px; line-height: 1.45; overflow-wrap: break-word;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }

    /* ── Launcher attention nudge ────────────────────────────────────────── */
    #cw-bubble.cw-nudge { animation: cwNudge .9s ease-in-out 1; }
    #cw-bubble.cw-wiggle { animation: cwNudge .9s ease-in-out 2; }
    @keyframes cwNudge {
      0%, 100% { transform: rotate(0); }
      15% { transform: rotate(-12deg); }
      30% { transform: rotate(10deg); }
      45% { transform: rotate(-8deg); }
      60% { transform: rotate(6deg); }
      75% { transform: rotate(-3deg); }
    }

    /* ── Time-based attention: expanding pulse ring + a fake "1" badge ────── */
    #cw-bubble.cw-attn-ring { animation: cwAttnRing 1.5s ease-out 2; }
    @keyframes cwAttnRing {
      0%   { box-shadow: 0 10px 28px -6px var(--cw-glow, rgba(79,70,229,.5)), 0 0 0 0 var(--cw-glow, rgba(79,70,229,.5)); }
      100% { box-shadow: 0 10px 28px -6px var(--cw-glow, rgba(79,70,229,.5)), 0 0 0 16px rgba(99,102,241,0); }
    }
    #cw-attn-badge {
      position: absolute; top: -3px; right: -3px;
      min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px;
      background: #ef4444; color: #fff; font-size: 11px; font-weight: 800; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(2,6,23,.35); z-index: 4; pointer-events: none;
      animation: cwBadgePop .3s cubic-bezier(.34,1.56,.64,1), cwBadgePulse 1.8s ease-in-out .35s infinite;
    }
    @keyframes cwBadgePop { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes cwBadgePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }

    /* ── Mobile: fullscreen panel, hide the launcher while open ──────────── */
    @media (max-width: 480px) {
      #cw-panel, #cw-panel.cw-expanded {
        width: 100vw; max-width: 100vw;
        height: 100vh; height: 100dvh; max-height: 100dvh;
        bottom: 0; right: 0; left: 0; border-radius: 0;
      }
      #cw-bubble.cw-bubble-open { display: none; }
      #cw-menu { top: 62px; right: 14px; }
      #cw-menu .cw-menu-item[data-act="expand"] { display: none; }
      #cw-greet, #cw-notif { bottom: 88px; }
    }

    /* iOS auto-zooms the page when a focused input is smaller than 16px, which
       shifts and horizontally overflows the fixed panel (clipping the send button).
       Keep focusable inputs at 16px on touch devices to prevent the zoom. */
    @media (pointer: coarse) {
      #cw-input, .cw-lead-input { font-size: 16px; }
    }

    /* ── RTL (Arabic, Hebrew…): the panel's dir="rtl" flips text and flex flow,
       but these physical properties need mirroring by hand. ──────────────── */
    /* Keep the CONVERSATION sides the same as LTR even on RTL widgets (owner
       preference): the visitor's own messages stay on the RIGHT, the assistant's
       on the LEFT. dir="rtl" would otherwise flip the flex flow and swap them.
       Each bubble's text still flows RTL via its own dir="auto", so only the side
       is pinned, not the script. The avatar line is reversed back so the bot
       avatar sits at the far left, and the tail radii fall back to the LTR base
       (user tail bottom-right, bot bottom-left) by NOT overriding them here. */
    #cw-panel[dir="rtl"] .cw-msg-wrap.cw-user-wrap { align-self: flex-start; align-items: flex-start; }
    #cw-panel[dir="rtl"] .cw-msg-wrap.cw-bot-wrap  { align-self: flex-end;   align-items: flex-end; }
    #cw-panel[dir="rtl"] .cw-bot-line { flex-direction: row-reverse; }
    #cw-panel[dir="rtl"] .cw-menu-item,
    #cw-panel[dir="rtl"] .cw-table th,
    #cw-panel[dir="rtl"] .cw-table td { text-align: right; }
    #cw-panel[dir="rtl"] #cw-menu { right: auto; left: 12px; transform-origin: top left; }
    #cw-panel[dir="rtl"] #cw-listening { left: auto; right: 46px; }
    #cw-panel[dir="rtl"] .cw-retry { margin-left: 0; margin-right: 8px; }

    /* RTL polish for the greeting / re-engagement card. Its close button is
       absolutely positioned (so it doesn't auto-flip with dir), and the bubble
       tail + head padding + chip text need mirroring for Arabic/Hebrew widgets. */
    #cw-greet[dir="rtl"] #cw-greet-x { right: auto; left: 9px; }
    #cw-greet[dir="rtl"] .cw-greet-head { padding-right: 0; padding-left: 16px; }
    #cw-greet[dir="rtl"] .cw-greet-bubble { border-bottom-left-radius: 14px; border-bottom-right-radius: 5px; }
    #cw-greet[dir="rtl"] .cw-greet-chip { text-align: right; }
    #cw-notif[dir="rtl"] #cw-notif-x { right: auto; left: 9px; }
    #cw-notif[dir="rtl"] .cw-notif-head { padding-right: 0; padding-left: 16px; }

    /* ── Human takeover handoff ──────────────────────────────────────── */
    .cw-takeover { align-self: stretch; display: flex; justify-content: center; margin: 12px 0 6px; }
    .cw-takeover-card {
      position: relative; overflow: hidden;
      display: flex; align-items: center; gap: 13px;
      max-width: 94%; padding: 13px 18px 13px 14px; border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,.6), var(--cw-glow-soft, rgba(99,102,241,.12)));
      border: 1px solid var(--cw-glow-soft, rgba(99,102,241,.22));
      box-shadow: 0 12px 30px -14px rgba(2,6,23,.4);
      animation: cwTakeoverIn .55s cubic-bezier(.16,1,.3,1) both;
    }
    .cw-takeover-card::after {
      content: ""; position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.55) 50%, transparent 75%);
      transform: translateX(-130%); animation: cwTakeoverSweep 1.05s ease .35s both;
    }
    .cw-takeover-avatar {
      position: relative; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; color: var(--cw-fg, #fff);
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
      box-shadow: 0 0 0 3px #fff, 0 4px 12px -2px rgba(2,6,23,.35);
      animation: cwTakeoverPop .55s cubic-bezier(.34,1.56,.64,1) both;
    }
    .cw-takeover-avatar svg { width: 22px; height: 22px; }
    .cw-takeover-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
    /* live "online" presence dot — reinforces a real person is here */
    .cw-takeover-avatar::after {
      content: ""; position: absolute; right: -1px; bottom: -1px;
      width: 12px; height: 12px; border-radius: 50%;
      background: #22c55e; box-shadow: 0 0 0 2.5px #fff;
      animation: cwTakeoverPop .5s cubic-bezier(.34,1.56,.64,1) .25s both;
    }
    .cw-takeover-text { display: flex; flex-direction: column; line-height: 1.4; min-width: 0; }
    .cw-takeover-text strong { font-size: 14px; color: #0b1220; font-weight: 700; }
    .cw-takeover-text strong b { color: var(--cw-color-dk, #4f46e5); font-weight: 800; }
    .cw-takeover-text span { font-size: 12px; color: #64748b; margin-top: 2px; }

    @keyframes cwTakeoverIn { from { opacity: 0; transform: translateY(12px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes cwTakeoverPop { 0% { transform: scale(0) rotate(-25deg); } 100% { transform: scale(1) rotate(0); } }
    @keyframes cwTakeoverSweep { to { transform: translateX(130%); } }
    @keyframes cwAvatarSwap { 0% { transform: scale(.4); opacity: .2; } 60% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }

    .cw-handback { align-self: center; display: flex; align-items: center; gap: 7px; margin: 6px 0 2px;
      font-size: 11.5px; color: #64748b; animation: cwTakeoverIn .4s ease both; }
    .cw-handback svg { width: 13px; height: 13px; color: var(--cw-color, #6366f1); }

    /* ── "Connecting you to a human" pending card ────────────────────────── */
    .cw-connecting { align-self: stretch; display: flex; justify-content: center; margin: 12px 0 6px; }
    .cw-connecting-card {
      display: flex; align-items: center; gap: 13px;
      max-width: 94%; padding: 13px 18px 13px 14px; border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,.6), var(--cw-glow-soft, rgba(99,102,241,.12)));
      border: 1px solid var(--cw-glow-soft, rgba(99,102,241,.22));
      box-shadow: 0 12px 30px -14px rgba(2,6,23,.4);
      animation: cwTakeoverIn .5s cubic-bezier(.16,1,.3,1) both;
    }
    .cw-connecting-avatar {
      position: relative; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; color: var(--cw-fg, #fff);
      background: var(--cw-color, #6366f1);
      background-image: linear-gradient(135deg, var(--cw-color, #6366f1), var(--cw-color-dk, #4f46e5));
      box-shadow: 0 0 0 3px #fff, 0 4px 12px -2px rgba(2,6,23,.35);
    }
    .cw-connecting-avatar svg { width: 22px; height: 22px; }
    .cw-connecting-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
    /* expanding "searching for an agent" ring */
    .cw-connecting-avatar::before {
      content: ""; position: absolute; inset: -3px; border-radius: 50%;
      border: 2px solid var(--cw-color, #6366f1); opacity: .6;
      animation: cwConnPulse 1.8s ease-out infinite;
    }
    .cw-connecting-text { display: flex; flex-direction: column; line-height: 1.4; min-width: 0; }
    .cw-connecting-text strong { font-size: 14px; color: #0b1220; font-weight: 700; display: flex; align-items: center; gap: 7px; }
    .cw-connecting-text span { font-size: 12px; color: #64748b; margin-top: 2px; }
    .cw-conn-dots { display: inline-flex; gap: 3px; }
    .cw-conn-dots i { width: 5px; height: 5px; border-radius: 50%; background: var(--cw-color, #6366f1); display: inline-block; animation: cwConnDot 1.2s infinite ease-in-out; }
    .cw-conn-dots i:nth-child(2) { animation-delay: .18s; }
    .cw-conn-dots i:nth-child(3) { animation-delay: .36s; }
    @keyframes cwConnPulse { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(1.55); opacity: 0; } }
    @keyframes cwConnDot { 0%, 60%, 100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-4px); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .cw-connecting-avatar::before { animation: none; opacity: 0; }
      .cw-conn-dots i { animation: none; }
    }
  `;

  // ── HTML ─────────────────────────────────────────────────────────────────────
  const html = `
    <button id="cw-bubble" aria-label="Open chat">
      <svg id="cw-ic-chat" class="cw-ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="cw-ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <span id="cw-online-dot" aria-hidden="true"></span>
    </button>

    <div id="cw-panel" role="dialog" aria-label="Chat">
      <div id="cw-header">
        <div id="cw-header-avatar">
          <img id="cw-header-avatar-img" alt="" src="${apiBase}/bot_avatar.png">
          <svg id="cw-header-avatar-fb" style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>
        <div id="cw-header-text">
          <div id="cw-header-title">Support</div>
          <div id="cw-header-sub"><span class="cw-status-dot"></span><span class="cw-status-text">Online</span></div>
        </div>
        <button id="cw-menu-btn" aria-label="Quick actions" aria-haspopup="true" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button id="cw-close" aria-label="Close chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div id="cw-menu" role="menu" hidden>
        <button class="cw-menu-item" data-act="expand" role="menuitem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          <span id="cw-menu-expand-label">Expand view</span>
        </button>
        <button class="cw-menu-item" data-act="new" role="menuitem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          <span id="cw-menu-new-label">New conversation</span>
        </button>
        <button class="cw-menu-item" data-act="sound" role="menuitem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          <span id="cw-menu-sound-label">Sound: On</span>
        </button>
        <button class="cw-menu-item" data-act="minimize" role="menuitem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span id="cw-menu-min-label">Minimize chat</span>
        </button>
      </div>

      <div id="cw-messages"></div>

      <div id="cw-emoji-panel" hidden></div>

      <div id="cw-drop" hidden>
        <div id="cw-drop-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span id="cw-drop-title">Drop files here</span>
          <span id="cw-drop-sub">Images or PDF</span>
        </div>
      </div>

      <div id="cw-lightbox" hidden>
        <div id="cw-lb-bar">
          <span id="cw-lb-name"></span>
          <span style="display:flex;gap:2px;flex-shrink:0">
            <a id="cw-lb-download" class="cw-lb-btn" download aria-label="Download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
            <button id="cw-lb-close" class="cw-lb-btn" type="button" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </span>
        </div>
        <div id="cw-lb-stage"><img id="cw-lb-img" alt=""></div>
      </div>

      <div id="cw-footer">
        <div id="cw-attach-strip" hidden></div>
        <input id="cw-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" multiple hidden>
        <div id="cw-input-wrap">
          <button id="cw-emoji-btn" type="button" aria-label="Emoji">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            </svg>
          </button>
          <button id="cw-attach-btn" type="button" aria-label="Attach a file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <textarea id="cw-input" rows="1" dir="auto" placeholder="Type a message…" aria-label="Message"></textarea>
          <div id="cw-listening" aria-hidden="true"><span class="cw-eq"><i></i><i></i><i></i><i></i></span><span id="cw-listening-label">Listening…</span></div>
          <button id="cw-mic-btn" type="button" aria-label="Voice to text" hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button id="cw-send" aria-label="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div id="cw-powered">
          <a href="https://easychatwidget.com" target="_blank" rel="noopener">
            <span class="cw-pb-pre">We run on</span>
            <img class="cw-pb-logo" src="${apiBase}/bot_avatar.png" alt="" aria-hidden="true">
            <span class="cw-pb-name">EasyChatWidget</span>
          </a>
        </div>
      </div>
    </div>
  `;

  // ── Mount ────────────────────────────────────────────────────────────────────
  // Already mounted? A SPA host (site builders like yu0.live, and some themes)
  // re-injects or re-runs our <script> on client-side navigation, which would
  // mount a SECOND widget: duplicate #cw-bubble/#cw-panel ids break the open
  // logic (clicks stop working) and the fresh instance flashes our default avatar
  // instead of the owner's. If a widget root is already on the page, do nothing —
  // the existing instance keeps working across the SPA navigation.
  if (document.getElementById('cw-widget-root')) return;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Whether the widget should render anything on the page. Owner can hide it
  // from the Settings tab; loadConfig() sets the authoritative value. Gates the
  // launcher AND the body-level greeting card / reply popover.
  let widgetActive = true;

  const container = document.createElement('div');
  container.id = 'cw-widget-root';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Instant hide for a returning visitor whose owner turned the widget off,
  // so nothing flashes before the fresh config confirms it. The live fetch in
  // loadConfig() re-shows it if the owner has since turned it back on.
  try {
    const _cwCached = JSON.parse(localStorage.getItem('_cw_brand_' + apiKey) || 'null');
    if (_cwCached && _cwCached.active === false) { container.style.display = 'none'; widgetActive = false; }
  } catch (e) {}

  // Reveal the launcher only once branding has resolved — from cache (instant for
  // returning visitors) or the live config (first visit) — so the default color
  // never flashes to the site's brand color. Idempotent.
  let _cwRevealed = false;
  function revealWidget() {
    if (_cwRevealed) return;
    _cwRevealed = true;
    container.classList.add('cw-ready');
  }
  // Safety net: never leave the widget hidden if the config is slow or fails —
  // reveal with the default color after a short beat.
  setTimeout(revealWidget, 2000);

  const bubble   = document.getElementById('cw-bubble');
  const panel    = document.getElementById('cw-panel');
  const closeBtn = document.getElementById('cw-close');
  const messages = document.getElementById('cw-messages');
  const input    = document.getElementById('cw-input');
  const sendBtn  = document.getElementById('cw-send');
  const menuBtn  = document.getElementById('cw-menu-btn');
  const menu     = document.getElementById('cw-menu');
  const emojiBtn = document.getElementById('cw-emoji-btn');
  const micBtn   = document.getElementById('cw-mic-btn');
  const emojiPanel = document.getElementById('cw-emoji-panel');
  const inputWrap = document.getElementById('cw-input-wrap');
  const attachBtn = document.getElementById('cw-attach-btn');
  const fileInput = document.getElementById('cw-file');
  const attachStrip = document.getElementById('cw-attach-strip');

  // Keep the thread pinned to the bottom while its content is still growing.
  // Stored dimensions reserve space for new images, but anything without them
  // (older uploads, a slow PDF chip) lands after we've already scrolled and
  // shoves the view up — leaving the visitor stranded mid-thread. Watching each
  // bubble for a size change re-pins whatever the cause. Goes false the moment
  // they scroll up, so we never yank them back while they're reading.
  let cwStick = true;
  let cwRO = null;
  if (messages && typeof ResizeObserver !== 'undefined') {
    messages.addEventListener('scroll', function () {
      cwStick = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 60;
    }, { passive: true });
    cwRO = new ResizeObserver(function () {
      if (cwStick) messages.scrollTop = messages.scrollHeight;
    });
  }

  // Uploads waiting to ride along with the next message. Each entry:
  // { id, kind, name, url, preview, pending }. `id` stays null until the server
  // has taken the file, and sending is blocked while anything is still pending.
  let pendingAttachments = [];
  const MAX_ATTACHMENTS = 4;

  // Some host pages run a smooth-scroll library (Lenis, Locomotive, GSAP
  // ScrollSmoother…) that hijacks every wheel event on the page — so scrolling
  // over our panel scrolls the site instead of the chat. Keep the wheel inside
  // the message list: stop it reaching the host's handler, and if the host has
  // already killed the native scroll (capture-phase preventDefault), drive it
  // ourselves so the panel still scrolls.
  if (messages) {
    messages.addEventListener('wheel', function (e) {
      e.stopPropagation();
      if (e.defaultPrevented && messages.scrollHeight > messages.clientHeight) {
        messages.scrollTop += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      }
    }, { passive: true });
  }

  // Toggle the send button (calm vs vibrant) and the "Listening…" indicator,
  // which shows only while recording with no text yet.
  // ── Image viewer ─────────────────────────────────────────────────────────
  // Tap a photo to see it full size inside the panel, WhatsApp-style. Scoped to
  // the widget rather than a new browser tab: the visitor never leaves the host
  // page, and the signed URL stays out of their address bar / history.
  const lb        = document.getElementById('cw-lightbox');
  const lbImg     = document.getElementById('cw-lb-img');
  const lbName    = document.getElementById('cw-lb-name');
  const lbClose   = document.getElementById('cw-lb-close');
  const lbDownload = document.getElementById('cw-lb-download');

  function openLightbox(att) {
    if (!lb) return;
    // Full-resolution signed URL when we have it; the local preview is only a
    // fallback for a message still being sent.
    lbImg.src = att.url || att.preview;
    lbImg.alt = att.name || '';
    lbName.textContent = att.name || '';
    if (lbDownload) {
      lbDownload.href = att.url || att.preview;
      lbDownload.setAttribute('download', att.name || 'image');
    }
    lb.hidden = false;
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    lbImg.src = '';   // stop the decode and release the bytes
  }

  if (lb) {
    lbClose.addEventListener('click', closeLightbox);
    // Backdrop closes, the image itself doesn't.
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.id === 'cw-lb-stage') closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.hidden) closeLightbox();
    });
  }

  // ── Attachments ──────────────────────────────────────────────────────────
  // Files upload the moment they're picked, not on send. Two reasons: /chat/stream
  // is JSON + SSE and multipart would break the stream, and uploading early means
  // the server has already read the file (image description / PDF text) by the
  // time the visitor finishes typing a caption.

  function readyAttachments() {
    return pendingAttachments.filter(function (a) { return a.id && !a.pending; });
  }

  function renderAttachStrip() {
    if (!attachStrip) return;
    attachStrip.textContent = '';
    attachStrip.hidden = pendingAttachments.length === 0;

    pendingAttachments.forEach(function (att) {
      const chip = document.createElement('div');
      chip.className = 'cw-att-chip' + (att.kind === 'pdf' ? ' cw-att-pdf' : '') + (att.pending ? ' cw-att-busy' : '');

      if (att.kind === 'image' && att.preview) {
        const img = document.createElement('img');
        img.src = att.preview;
        img.alt = att.name || '';
        chip.appendChild(img);
      } else if (att.kind === 'pdf') {
        chip.appendChild(document.createTextNode('PDF'));
      }

      if (att.pending) {
        if (att.phase === 'uploading') {
          const bar = document.createElement('span');
          bar.className = 'cw-att-bar';
          const fill = document.createElement('i');
          fill.style.width = Math.round((att.progress || 0) * 100) + '%';
          bar.appendChild(fill);
          chip.appendChild(bar);

          const pct = document.createElement('span');
          pct.className = 'cw-att-pct';
          pct.textContent = Math.round((att.progress || 0) * 100) + '%';
          chip.appendChild(pct);
        } else {
          // Bytes are up; the server is reading the file.
          const sp = document.createElement('span');
          sp.className = 'cw-att-spin';
          chip.appendChild(sp);
        }
      } else {
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'cw-att-x';
        x.setAttribute('aria-label', 'Remove attachment');
        x.textContent = '×';
        x.onclick = function () {
          if (att.preview) { try { URL.revokeObjectURL(att.preview); } catch (e) {} }
          pendingAttachments = pendingAttachments.filter(function (p) { return p !== att; });
          renderAttachStrip();
          updateSendState();
        };
        chip.appendChild(x);
      }

      attachStrip.appendChild(chip);
    });
  }

  /**
   * POST the file with real upload progress.
   *
   * XHR rather than fetch: fetch has no upload-progress hook at all, and on a
   * phone photo over mobile data a silent 10-second wait reads as broken.
   */
  function postAttachment(file, onProgress) {
    return new Promise(function (resolve) {
      const fd = new FormData();
      fd.append('api_key', apiKey);
      fd.append('visitor_id', visitorId);
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiBase + '/api/chat/attachment');
      // Without this Laravel answers a validation failure with a 302 to the
      // homepage instead of JSON, which reads as a 200 success with no id.
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = function () {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch (err) {}
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, data: data });
      };
      xhr.onerror = function () { resolve({ ok: false, data: {} }); };
      xhr.ontimeout = function () { resolve({ ok: false, data: {} }); };
      xhr.timeout = 120000;
      xhr.send(fd);
    });
  }

  async function uploadFile(file) {
    if (pendingAttachments.length >= MAX_ATTACHMENTS) return;

    const isImage = /^image\//.test(file.type);
    const att = {
      id: null,
      pending: true,
      phase: 'uploading',
      progress: 0,
      kind: isImage ? 'image' : 'pdf',
      name: file.name,
      // Local preview, so the thumbnail appears instantly rather than after the
      // round-trip (which includes the image description).
      preview: isImage ? URL.createObjectURL(file) : null,
    };
    pendingAttachments.push(att);
    renderAttachStrip();
    updateSendState();

    const res = await postAttachment(file, function (frac) {
      att.progress = frac;
      // At 100% the bytes are up but the server is still reading the file
      // (describing an image / extracting PDF text), so switch to the spinner
      // rather than parking a full bar that looks stuck.
      att.phase = frac >= 1 ? 'processing' : 'uploading';
      renderAttachStrip();
    });

    // Belt and braces: a success without an id is not a success.
    if (!res.ok || !res.data.id) {
      if (att.preview) { try { URL.revokeObjectURL(att.preview); } catch (e) {} }
      pendingAttachments = pendingAttachments.filter(function (p) { return p !== att; });
      // `error` is ours (plan cap, bad type); `message` is Laravel's validator.
      addMessage('bot', res.data.error || res.data.message || 'Sorry, that file could not be uploaded.', false);
    } else {
      att.id = res.data.id;
      att.url = res.data.url;
      att.pending = false;
    }

    renderAttachStrip();
    updateSendState();
  }

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      Array.prototype.slice.call(fileInput.files || []).slice(0, MAX_ATTACHMENTS).forEach(uploadFile);
      fileInput.value = ''; // let the same file be re-picked after removal
    });
  }

  // Drag a file onto the panel. Everything is scoped to #cw-panel on purpose:
  // preventDefault on the whole document would hijack the HOST page's own
  // drag-and-drop, and this script is a guest on someone else's site.
  const dropZone = document.getElementById('cw-drop');
  const panelEl  = document.getElementById('cw-panel');
  if (dropZone && panelEl) {
    // dragenter/dragleave fire for every child element crossed, so a naive
    // "hide on dragleave" flickers. Count depth instead.
    let dragDepth = 0;

    const hasFiles = function (e) {
      const t = e.dataTransfer && e.dataTransfer.types;
      return t && Array.prototype.indexOf.call(t, 'Files') !== -1;
    };

    panelEl.addEventListener('dragenter', function (e) {
      if (!hasFiles(e)) return;   // ignore text/link drags
      e.preventDefault();
      dragDepth++;
      dropZone.hidden = false;
    });

    panelEl.addEventListener('dragover', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();          // required, or the browser refuses the drop
      e.dataTransfer.dropEffect = 'copy';
    });

    panelEl.addEventListener('dragleave', function () {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) dropZone.hidden = true;
    });

    panelEl.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();          // else the browser navigates away to the file
      dragDepth = 0;
      dropZone.hidden = true;
      Array.prototype.slice.call(e.dataTransfer.files || [])
        .slice(0, MAX_ATTACHMENTS)
        .forEach(uploadFile);
    });
  }

  // Paste an image straight from the clipboard (Win+Shift+S, Cmd+Ctrl+Shift+4,
  // or copy-image-from-a-page). This is how people actually send screenshots —
  // saving to disk first just to re-pick it is friction.
  if (input) {
    input.addEventListener('paste', function (e) {
      const items = (e.clipboardData || window.clipboardData || {}).items;
      if (!items) return;

      const files = [];
      for (let i = 0; i < items.length; i++) {
        // Only files — a normal text paste has kind 'string' and must still work.
        if (items[i].kind === 'file') {
          const f = items[i].getAsFile();
          if (f && /^image\//.test(f.type)) files.push(f);
        }
      }
      if (!files.length) return;

      // Screenshots arrive named "image.png" (or nothing at all); stamp them so
      // several in one chat are tellable apart in the agent's inbox.
      e.preventDefault();
      files.slice(0, MAX_ATTACHMENTS).forEach(function (f) {
        const ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        uploadFile(new File([f], 'pasted-' + Date.now() + '.' + ext, { type: f.type }));
      });
    });
  }

  function updateSendState() {
    if (!inputWrap) return;
    // An attachment on its own is a valid message, so send lights up for it too
    // (this used to key off text alone).
    const hasText = input.value.trim().length > 0 || readyAttachments().length > 0;
    inputWrap.classList.toggle('cw-has-text', hasText);
    inputWrap.classList.toggle('cw-listening', !!recording && !hasText);
  }

  // Header avatar: if the configured logo fails (e.g. a site that blocks
  // hotlinking its favicon), fall back to the bundled avatar, then the icon.
  const headerAvatarImg = document.getElementById('cw-header-avatar-img');
  if (headerAvatarImg) {
    headerAvatarImg.addEventListener('error', function () {
      const bundled = apiBase + '/bot_avatar.png';
      if (headerAvatarImg.src !== bundled) {
        headerAvatarImg.src = bundled;
        return;
      }
      headerAvatarImg.style.display = 'none';
      const fb = document.getElementById('cw-header-avatar-fb');
      if (fb) fb.style.display = 'block';
    });
  }

  // ── Launcher icons ───────────────────────────────────────────────────────────
  // Inner SVG markup for each selectable launcher icon (viewBox 0 0 24 24,
  // stroke-based to match the close icon). Keys mirror the dashboard picker.
  const CW_ICONS = {
    chat:     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    message:  '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    help:     '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    buoy:     '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>',
    headset:  '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
    sparkles: '<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/>',
  };
  function applyIcon(name) {
    const el = document.getElementById('cw-ic-chat');
    if (el && CW_ICONS[name]) el.innerHTML = CW_ICONS[name];
  }
  // Swap the launcher look. 'flat' (default) = no extra class; every other
  // style maps to a single cw-<style> class. Clear the others first so changing
  // styles never leaves a stale class behind.
  const CW_STYLES = ['orb', 'squircle', 'glass', 'halo', 'outline'];
  function applyLauncherStyle(style) {
    const b = document.getElementById('cw-bubble');
    if (!b) return;
    CW_STYLES.forEach(function (s) { b.classList.remove('cw-' + s); });
    if (CW_STYLES.indexOf(style) !== -1) b.classList.add('cw-' + style);
  }

  // Apply cached branding synchronously so a returning visitor sees the correct
  // color + logo from the first paint (no flash of the indigo/bundled defaults).
  // Show/hide the "Powered by" badge. Visible by default; only hidden when the
  // owner's plan allows it (config.show_branding === false).
  function applyPoweredBy(show) {
    const el = document.getElementById('cw-powered');
    if (!el) return;
    el.style.display = show === false ? 'none' : '';
    // Admin-selected badge style (pure CSS class; no extra requests).
    ['colored', 'pill', 'glow', 'bold'].forEach(function (s) { el.classList.remove('cw-pbs-' + s); });
    var style = (configData && configData.powered_by_style) || 'default';
    if (style !== 'default') el.classList.add('cw-pbs-' + style);
    // Admin-managed badge logo; falls back to the bundled mark in the HTML.
    var logo = configData && configData.powered_by_logo;
    if (logo) {
      var img = el.querySelector('.cw-pb-logo');
      if (img) img.src = logo;
    }
  }

  // Translate the fixed UI chrome to the widget's language and flip layout to RTL
  // for right-to-left languages. Called once the config (with .language) loads.
  // Only touches elements still showing their literal English defaults so it
  // never clobbers dynamic state (e.g. a live "Typing…"/agent name).
  function applyI18n() {
    try {
      var input = document.getElementById('cw-input');
      if (input) input.setAttribute('placeholder', cwT('placeholder'));
      var send = document.getElementById('cw-send');
      if (send) send.setAttribute('aria-label', cwT('send'));
      // Badge = "<prefix> [logo] EasyChatWidget". A custom copy (set by us for A/B
      // testing) replaces the label, but we still split out the "EasyChatWidget"
      // brand token so the mark stays right before it. Localized default otherwise.
      var pbA = document.querySelector('#cw-powered a');
      if (pbA) {
        var pbPre = pbA.querySelector('.cw-pb-pre');
        var pbName = pbA.querySelector('.cw-pb-name');
        if (pbPre && pbName) {
          var pbFull = (configData && configData.powered_by) || (cwRunOn() + ' EasyChatWidget');
          var pbIdx = pbFull.indexOf('EasyChatWidget');
          if (pbIdx >= 0) {
            pbPre.textContent = pbFull.slice(0, pbIdx).trim();
            pbName.textContent = pbFull.slice(pbIdx);
            pbName.style.display = '';
          } else {
            pbPre.textContent = pbFull;
            pbName.textContent = '';
            pbName.style.display = 'none';
          }
          pbPre.style.display = pbPre.textContent ? '' : 'none';
        }
      }
      var st = document.querySelector('.cw-status-text');
      if (st && st.textContent === 'Online') st.textContent = cwT('online');
      var ht = document.getElementById('cw-header-title');
      if (ht && ht.textContent === 'Support') ht.textContent = cwT('title');
      var lis = document.getElementById('cw-listening-label');
      if (lis) lis.textContent = cwT('listening');
      var mNew = document.getElementById('cw-menu-new-label');
      if (mNew) mNew.textContent = cwT('newChat');
      var mMin = document.getElementById('cw-menu-min-label');
      if (mMin) mMin.textContent = cwT('minimize');
      var mExp = document.getElementById('cw-menu-expand-label');
      if (mExp && mExp.textContent === 'Expand view') mExp.textContent = cwT('expandView');
      var mSnd = document.getElementById('cw-menu-sound-label');
      if (mSnd && mSnd.textContent === 'Sound: On') mSnd.textContent = cwT('soundOn');
      // RTL layout for Arabic/Hebrew/etc.
      var isRtl = CW_RTL.indexOf(cwLang()) !== -1;
      var panel = document.getElementById('cw-panel');
      if (panel) panel.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      // The composer needs an explicit direction: on an RTL widget "dir=auto"
      // leaves an EMPTY field with an LTR caret (on the left), so force rtl there
      // so the caret + placeholder start on the right. LTR widgets keep "auto" so
      // the field still follows whatever the visitor types.
      if (input) input.setAttribute('dir', isRtl ? 'rtl' : 'auto');
    } catch (e) {}
  }

  // configData must EXIST (as null) before applyCachedBranding runs: the cached
  // paint calls applyBranding → cwLocalizeTitle → cwLang, which reads configData.
  // It is also assigned later where the rest of the runtime state lives, but the
  // boot-time cached paint fires first, so declaring it there would leave it in the
  // temporal dead zone and throw "Cannot access 'configData' before initialization"
  // — which the outer try/catch would treat as fatal and tear the widget down.
  let configData = null;

  (function applyCachedBranding() {
    // The cached paint is only a flash-preventer for returning visitors; it must
    // NEVER be able to tear the whole widget down. Any error here is swallowed and
    // we still reveal, so the real config load can take over normally.
    try {
      const c = cachedBrand();
      if (!c) return;
      if (c.color || c.title) applyBranding(c.color, c.title);
      if (c.icon) applyIcon(c.icon);
      if (c.style) applyLauncherStyle(c.style);
      if (c.avatar && headerAvatarImg) headerAvatarImg.src = c.avatar;
      if (c.branding === false) applyPoweredBy(false);
    } catch (e) {}
    // Returning visitor: brand color is already applied, so reveal immediately —
    // unless this page is excluded via data-hide-on, in which case stay hidden so
    // there's no flash before config confirms it (setting display in the same block
    // as the reveal paints hidden, no visible flash).
    try { revealWidget(); if (cwAttrHidden()) container.style.display = 'none'; } catch (e) {}
  })();

  // Extra styles for the streaming / teaser / lead / unread features.
  const extraStyle = document.createElement('style');
  extraStyle.textContent = [
    '#cw-badge{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ef4444;color:#fff;font:700 11px/18px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;display:none;align-items:center;justify-content:center}',
    '.cw-lead{margin:8px 0 4px;padding:12px;border:1px solid rgba(15,23,42,.1);border-radius:12px;background:#f8fafc}',
    '.cw-lead-text{font:600 13px/1.5 system-ui,sans-serif;color:#0b1220;margin-bottom:8px}',
    '.cw-lead-row{display:flex;gap:6px}',
    '.cw-lead-input{flex:1;min-width:0;border:1px solid #e5e7eb;border-radius:8px;padding:7px 10px;font:400 13px system-ui,sans-serif;outline:none;color:#0b1220;background:#fff;-webkit-text-fill-color:#0b1220}',
    '.cw-lead-input::placeholder{color:#9aa3b2;-webkit-text-fill-color:#9aa3b2}',
    '.cw-lead-input:focus{border-color:var(--cw-color,#4F46E5)}',
    // Keep the lead input at 16px on touch so iOS doesn't auto-zoom (which
    // overflows the fixed panel and clips the send button). This block loads
    // after the main stylesheet, so it must re-assert the size the base
    // .cw-lead-input font shorthand above would otherwise win back.
    '@media (pointer:coarse){.cw-lead-input{font-size:16px}}',
    '.cw-lead-btn{flex-shrink:0;border:none;border-radius:8px;background:var(--cw-color,#4F46E5);color:var(--cw-fg,#fff);font:600 13px system-ui,sans-serif;padding:7px 12px;cursor:pointer}',
    '.cw-lead-btn:disabled{opacity:.6;cursor:default}',
    // WhatsApp-style quoted message, pinned at the top of a bubble.
    '.cw-quote{border-left:3px solid var(--cw-color,#4F46E5);background:rgba(15,23,42,.06);border-radius:6px;padding:4px 8px;margin:0 0 6px}',
    '.cw-quote-author{font:700 11px/1.4 system-ui,sans-serif;color:var(--cw-color,#4F46E5)}',
    '.cw-quote-text{font:400 12px/1.4 system-ui,sans-serif;color:#475569;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    // Multi-field lead form: stack the inputs, full-width submit under them.
    '.cw-lead-fields{display:flex;flex-direction:column;gap:6px;margin-bottom:6px}',
    'select.cw-lead-input{background:#fff;cursor:pointer;appearance:auto;-webkit-appearance:auto}',
    '.cw-lead-btn-full{width:100%}',
    '.cw-retry{margin-left:8px;border:1px solid currentColor;border-radius:7px;background:transparent;color:var(--cw-color,#4F46E5);font:600 12px system-ui,sans-serif;padding:3px 10px;cursor:pointer}',
  ].join('');
  document.head.appendChild(extraStyle);

  const badge = document.createElement('span');
  badge.id = 'cw-badge';
  bubble.appendChild(badge);

  // ── State ────────────────────────────────────────────────────────────────────
  let isOpen          = localStorage.getItem('_cw_open') === '1';
  let isLoading       = false;
  let initPromise     = null;
  let conversationId  = null;
  let currentMode     = 'ai';
  let typingEl        = null;
  let pusherChannel   = null;
  // One shared socket for the widget's lifetime. Kept so "new chat" can unsubscribe
  // the old channel instead of leaking a fresh connection on every reset.
  let pusherClient    = null;
  let reverbConfig    = null;
  let suggestionsEl   = null;
  // High-water mark of the newest message already on screen. Re-syncs append only
  // ids above this, so they can run as often as we like without duplicating.
  let lastMessageId   = 0;
  // Guards for resyncMissedMessages(): one in flight at a time, and not more than
  // once every few seconds (focus/visibility can fire in bursts).
  let resyncing       = false;
  let lastResyncAt    = 0;
  // Whether the socket has ever been up. Distinguishes the first connect (nothing
  // missed) from a re-connect (must catch up).
  let hasConnected    = false;
  // configData is declared earlier (above applyCachedBranding) to avoid a temporal
  // dead zone during the boot-time cached paint; do not re-declare it here.
  let configPromise   = null;
  let agentName       = '';   // human agent identity (set on takeover)
  let agentAvatar     = '';
  let lastUserText    = '';
  let unread          = 0;
  let leadAsked       = false;
  let notifTimer      = null;
  let audioCtx        = null;
  let soundOn         = localStorage.getItem('_cw_sound') !== '0';

  // ── Visitor activity: typing / read receipts / presence ─────────────────────
  let typingSentAt    = 0;
  let typingOffTimer  = null;
  let presenceTimer   = null;

  function postActivity(type, extra) {
    if (!conversationId) return;
    try {
      fetch(apiBase + '/api/widget/' + apiKey + '/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(Object.assign({ visitor_id: visitorId, type: type }, extra || {})),
      }).catch(function () {});
    } catch (e) {}
  }

  // Tell the agent the visitor is typing (throttled), auto-clearing when idle.
  function visitorTyping() {
    const now = Date.now();
    if (now - typingSentAt > 2000) {
      typingSentAt = now;
      postActivity('typing', { typing: true });
    }
    clearTimeout(typingOffTimer);
    typingOffTimer = setTimeout(function () {
      postActivity('typing', { typing: false });
      typingSentAt = 0;
    }, 2500);
  }

  // Mark the agent's messages as seen (chat open & tab visible) → ✓✓ for them.
  function markVisitorRead() {
    if (isOpen && document.visibilityState === 'visible') postActivity('read');
  }

  // Heartbeat so the dashboard can show the visitor as online.
  function startPresence() {
    if (presenceTimer) return;
    postActivity('presence');
    presenceTimer = setInterval(function () {
      if (document.visibilityState === 'visible') postActivity('presence');
    }, 25000);
  }

  // ── Apply branding ───────────────────────────────────────────────────────────
  function hexToRgb(hex) {
    if (!hex) return null;
    hex = String(hex).replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    if (hex.length !== 6 || /[^0-9a-fA-F]/.test(hex)) return null;
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }
  function darkenHex(hex, amt) {
    const c = hexToRgb(hex);
    if (!c) return null;
    const f = 1 - amt;
    const to2 = function (n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'); };
    return '#' + to2(c.r * f) + to2(c.g * f) + to2(c.b * f);
  }
  function lightenHex(hex, amt) {
    const c = hexToRgb(hex);
    if (!c) return null;
    const to2 = function (n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'); };
    const up = function (n) { return n + (255 - n) * amt; };
    return '#' + to2(up(c.r)) + to2(up(c.g)) + to2(up(c.b));
  }

  function applyBranding(color, title) {
    if (color) {
      const root = document.documentElement.style;
      root.setProperty('--cw-color', color);
      const rgb = hexToRgb(color);
      const lum = rgb ? (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255 : 0.3;
      // Gradient partner: normally a touch darker for depth. A near-black brand
      // can't go darker, so lighten it instead — otherwise the header/launcher/
      // send button collapse to a flat, dead black with no dimension.
      const dk = lum < 0.14 ? lightenHex(color, 0.30) : darkenHex(color, 0.18);
      if (dk) root.setProperty('--cw-color-dk', dk);
      if (rgb) {
        // Soften the drop-shadow for very dark brands (a pure-black glow reads as
        // a harsh smudge); keep the colored halo for everything else.
        const glowA = lum < 0.14 ? 0.28 : 0.45;
        const softA = lum < 0.14 ? 0.10 : 0.15;
        root.setProperty('--cw-glow', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + glowA + ')');
        root.setProperty('--cw-glow-soft', 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + softA + ')');
        // Keep text/icons legible on the brand color. White reads well on saturated
        // brand colors (orange, amber, green, red), so only fall back to dark text
        // for genuinely pale/near-white brands where white would vanish.
        root.setProperty('--cw-fg', lum > 0.75 ? '#1f2937' : '#ffffff');
        // Readable ink for brand-colored text sitting on white (chips, links):
        // a near-white/pale brand would vanish, so darken it when it's too light.
        root.setProperty('--cw-ink', lum > 0.68 ? darkenHex(color, 0.58) : color);
      }
    }
    if (title) {
      document.getElementById('cw-header-title').textContent = cwLocalizeTitle(title);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  // Split a Markdown table row "| a | b |" into trimmed cells.
  function splitTableRow(line) {
    let t = line.trim();
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    return t.split('|').map(function (c) { return c.trim(); });
  }

  // Convert GitHub-style Markdown tables (header row + |---| separator + body)
  // into HTML tables. Operates line-by-line so non-table text is untouched.
  function renderTables(s) {
    const lines = s.split('\n');
    const out = [];
    let i = 0;
    const isSep = function (l) {
      const t = (l || '').trim();
      return t.indexOf('|') !== -1 && t.indexOf('-') !== -1 && /^[\s|:-]+$/.test(t);
    };
    while (i < lines.length) {
      const header = lines[i];
      if (header && header.indexOf('|') !== -1 && isSep(lines[i + 1])) {
        const cols = splitTableRow(header);
        const rows = [];
        let j = i + 2;
        while (j < lines.length && lines[j].indexOf('|') !== -1 && lines[j].trim() !== '') {
          rows.push(splitTableRow(lines[j]));
          j++;
        }
        let html = '<div class="cw-table-wrap"><table class="cw-table"><thead><tr>';
        cols.forEach(function (c) { html += '<th>' + c + '</th>'; });
        html += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          html += '<tr>';
          for (let k = 0; k < cols.length; k++) html += '<td>' + (r[k] || '') + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table></div>';
        out.push(html);
        i = j;
      } else {
        out.push(header);
        i++;
      }
    }
    return out.join('\n');
  }

  function renderMarkdown(text) {
    // Escape ALL HTML-significant chars first (incl. quotes), so nothing in the
    // text — bot output OR anything a visitor coaxed it to echo — can inject a tag
    // or break out of an attribute (e.g. a crafted markdown-link URL into href).
    // Only the controlled markdown tags we add below are ever real HTML.
    let s = cwEscape(text);
    // Models often emit bullets inline as " * item" instead of on their own
    // line, promote those markers to real line breaks so they become a list.
    s = s.replace(/\s\*\s+/g, '\n* ');
    // Code blocks
    s = s.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Tables (after bold so cell headers can be bold; before lists/<br>).
    s = renderTables(s);
    // Bullet lists (lines starting with "* " or "- "), before italic so the
    // remaining single "*" markers aren't swallowed as emphasis.
    s = s.replace(/^[*-]\s+(.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');
    // Italic
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Markdown links [text](url), must come before bare URL detection.
    // Handles absolute (http/https), mailto:, and site-relative (/path) URLs —
    // the AI often links to relative pages like /register or /pricing.
    s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Bare URLs not already inside an href
    s = s.replace(/(?<![="'])(https?:\/\/[^\s<>"&]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    // Tidy newlines around list/table markup, then convert the rest to <br>.
    s = s.replace(/\n+(?=<\/?(?:ul|li))/g, '').replace(/(<\/li>)\n+/g, '$1');
    s = s.replace(/\n*(<div class="cw-table-wrap">)/g, '$1').replace(/(<\/div>)\n+/g, '$1');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  // Format a HH:MM AM/PM stamp from an ISO date (or now if absent).
  function fmtTime(ts) {
    let d;
    try { d = ts ? new Date(ts) : new Date(); } catch (e) { d = new Date(); }
    if (isNaN(d.getTime())) d = new Date();
    let h = d.getHours();
    const m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }

  // Branding cached from the last successful config load, so a returning visitor
  // paints the right colors/logo instantly (before the fresh fetch resolves).
  function cachedBrand() {
    try { return JSON.parse(localStorage.getItem('_cw_brand_' + apiKey) || 'null'); } catch (e) { return null; }
  }

  // A circular bot avatar image; falls back to an initial circle if it 404s.
  // imgClass styles the <img>; fbClass styles the fallback <div>.
  // The bot logo: per-widget avatar_url (set at onboarding, defaults to the
  // site favicon) with the cached logo, then the bundled image, as fallbacks.
  function currentAvatar() {
    if (configData && configData.avatar_url) return configData.avatar_url;
    const c = cachedBrand();
    if (c && c.avatar) return c.avatar;
    return apiBase + '/bot_avatar.png';
  }

  // The avatar to paint right now: the human agent's photo during a takeover,
  // otherwise the bot logo.
  function activeAvatar() {
    if (currentMode === 'human' && agentAvatar) return agentAvatar;
    return currentAvatar();
  }

  function avatarEl(imgClass, fbClass) {
    // A human agent with no uploaded photo mirrors the header exactly: a person
    // glyph on a brand circle, never the bot logo (which would misrepresent who
    // is actually replying).
    if (currentMode === 'human' && !agentAvatar) {
      const d = document.createElement('div');
      d.className = imgClass + ' cw-avatar-person';
      d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
      return d;
    }
    const img = document.createElement('img');
    img.className = imgClass;
    img.alt = '';
    const human = currentMode === 'human';
    const bundled = apiBase + '/bot_avatar.png';
    img.src = activeAvatar();
    img.addEventListener('error', function () {
      // For a human agent, a broken photo falls straight back to an initial circle
      // (showing the bot logo there would be misleading).
      if (!human && img.src !== bundled) {
        img.src = bundled;
        return;
      }
      const fb = document.createElement('div');
      fb.className = fbClass;
      const t = human
        ? (agentName || 'A')
        : ((configData && configData.widget_title) || 'A');
      fb.textContent = (String(t).trim().charAt(0) || 'A').toUpperCase();
      if (img.parentNode) img.parentNode.replaceChild(fb, img);
    });
    return img;
  }

  function botAvatar() {
    return avatarEl('cw-avatar', 'cw-avatar cw-avatar-fb');
  }

  // Build a bot-side wrap: a column holding an avatar+bubble line. The caller
  // appends its bubble into `line`, and may insert a label above / time below.
  function makeBotWrap() {
    const wrap = document.createElement('div');
    wrap.className = 'cw-msg-wrap cw-bot-wrap';
    const line = document.createElement('div');
    line.className = 'cw-bot-line';
    line.appendChild(botAvatar());
    wrap.appendChild(line);
    return { wrap: wrap, line: line };
  }

  // Label for a quoted message, from the visitor's point of view.
  function cwQuoteLabel(q) {
    if (!q) return '';
    if (q.role === 'user') return cwYouLabel();
    if (q.is_agent) return agentName || cwAgentLabel();
    return cwAiLabel();
  }

  function addMessage(role, text, isAgent, ts, quote, attachments) {
    const isUser = role === 'user';

    const el = document.createElement('div');
    el.className = 'cw-msg ' + (isUser ? 'cw-user' : 'cw-bot');
    // Direction follows the message's own content, not the panel — so an English
    // reply on an Arabic (RTL) widget renders left-to-right with correct
    // punctuation, and vice-versa. The bubble still sits on the sender's side.
    el.dir = 'auto';
    if (isUser) {
      el.textContent = text || '';
    } else {
      el.innerHTML = renderMarkdown(text || '');
    }

    // Attachments sit above the caption, the same way the quote block does.
    // Built as DOM nodes, never innerHTML: the filename is visitor-supplied.
    if (attachments && attachments.length) {
      const box = document.createElement('div');
      box.className = 'cw-msg-atts';
      attachments.forEach(function (a) {
        // Images open the in-panel viewer; PDFs still go to a new tab (the
        // browser renders those far better than we could).
        const link = document.createElement(a.kind === 'image' ? 'button' : 'a');
        if (a.kind === 'image') {
          link.type = 'button';
          link.onclick = function () { openLightbox(a); };
        } else {
          link.href = a.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        if (a.kind === 'image') {
          link.className = 'cw-msg-att';
          const img = document.createElement('img');
          // Prefer the local object URL we already made for the composer preview:
          // it paints immediately. Using the signed server URL here meant the
          // bubble sat empty (a collapsed zero-height img) until the round-trip
          // finished, so the image "appeared after a while". History/live messages
          // have no preview and fall back to the signed URL.
          img.src = a.preview || a.url;
          img.alt = a.name || 'attachment';
          // Reserve the box before the bytes land, or the thread reflows as each
          // photo arrives and the scroll position jumps.
          if (a.width && a.height) {
            img.width = a.width;
            img.height = a.height;
            img.style.aspectRatio = a.width + ' / ' + a.height;
          }
          link.appendChild(img);
        } else {
          link.className = 'cw-msg-file';
          const label = document.createElement('span');
          label.textContent = a.name || 'Document.pdf';
          link.appendChild(label);
        }
        box.appendChild(link);
      });
      el.insertBefore(box, el.firstChild);
    }

    // WhatsApp-style quote: a small preview of the replied-to message, pinned to
    // the top of this bubble.
    if (quote && quote.content) {
      const q = document.createElement('div');
      q.className = 'cw-quote';
      const qa = document.createElement('div');
      qa.className = 'cw-quote-author';
      qa.textContent = cwQuoteLabel(quote);
      const qt = document.createElement('div');
      qt.className = 'cw-quote-text';
      qt.textContent = quote.content;
      q.appendChild(qa);
      q.appendChild(qt);
      el.insertBefore(q, el.firstChild);
    }

    const time = document.createElement('div');
    time.className = 'cw-time';
    time.textContent = fmtTime(ts);

    let wrap;
    if (isUser) {
      wrap = document.createElement('div');
      wrap.className = 'cw-msg-wrap cw-user-wrap';
      wrap.appendChild(el);
      wrap.appendChild(time);
    } else {
      const b = makeBotWrap();
      wrap = b.wrap;
      const label = document.createElement('div');
      label.className = 'cw-sender-label';
      label.textContent = isAgent ? (agentName || cwAgentLabel()) : cwAiLabel();
      b.wrap.insertBefore(label, b.line);
      b.line.appendChild(el);
      b.wrap.appendChild(time);
    }

    messages.appendChild(wrap);
    // Watch this bubble: if an image inside it lands later and changes its
    // height, the observer re-pins us to the bottom.
    if (cwRO) cwRO.observe(wrap);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  // Render clickable starter questions under the welcome message.
  function renderSuggestions(list) {
    // Always offer a localized "talk to a human" chip LAST (even when the owner
    // configured no suggestions), unless a human is already handling the chat. It's
    // a normal chip: sending it lets the AI detect the handoff intent in any
    // language (the <<HUMAN>> control token) and connect a person.
    var items = (list || []).slice();
    var human = cwAskHuman();
    // Offer "Talk to a human" only while the owner has starter suggestions enabled —
    // if they turned suggestions off, hide this too. Not during an active handoff.
    if (currentMode !== 'human' && human && items.indexOf(human) === -1
        && !(configData && configData.show_suggestions === false)) {
      items.push(human);
    }
    if (!items.length) return;
    const box = document.createElement('div');
    box.className = 'cw-suggestions';
    items.forEach(function (q) {
      const chip = document.createElement('button');
      chip.className = 'cw-chip';
      chip.type = 'button';
      chip.textContent = q;
      chip.addEventListener('click', function () { sendMessage(q); });
      box.appendChild(chip);
    });
    messages.appendChild(box);
    messages.scrollTop = messages.scrollHeight;
    suggestionsEl = box;
  }

  function removeSuggestions() {
    if (suggestionsEl) { suggestionsEl.remove(); suggestionsEl = null; }
  }

  function showTyping() {
    if (typingEl) return;
    const b = makeBotWrap();
    typingEl = document.createElement('div');
    typingEl.className = 'cw-msg cw-bot cw-typing';
    const dots = document.createElement('div');
    dots.className = 'cw-typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    typingEl.appendChild(dots);
    b.line.appendChild(typingEl);
    messages.appendChild(b.wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    if (typingEl) {
      typingEl.closest('.cw-msg-wrap')?.remove();
      typingEl = null;
    }
  }

  function setLoading(on) {
    isLoading = on;
    sendBtn.disabled = on;
    input.disabled = on;
    setStatus(on ? 'Typing…' : 'Online'); // live header status
  }

  // Dynamically update the header presence line (keeps the green status dot).
  function setStatus(text) {
    const sub = document.getElementById('cw-header-sub');
    if (!sub) return;
    let label = sub.querySelector('.cw-status-text');
    if (!label) {
      label = document.createElement('span');
      label.className = 'cw-status-text';
      sub.appendChild(label);
    }
    // Callers pass the canonical English status; translate it for display while
    // keeping the class toggle keyed off the canonical value.
    var i18nMap = { 'Online': cwT('online'), 'Typing…': cwT('typing'), 'Connecting…': cwT('connecting') };
    label.textContent = i18nMap[text] || text;
    sub.classList.toggle('cw-typing-status', text === 'Typing…');
  }

  // ── Human takeover handoff animation ─────────────────────────────────────────
  function cwEscape(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setHeaderHuman(isHuman) {
    const img   = document.getElementById('cw-header-avatar-img');
    const fb    = document.getElementById('cw-header-avatar-fb');
    const av    = document.getElementById('cw-header-avatar');
    const title = document.getElementById('cw-header-title');

    if (isHuman) {
      // A real person joined: show the agent's identity in the header (name + photo),
      // so the header reflects who the visitor is now chatting with. Falls back to the
      // agent photo, else a person glyph, else keeps the widget avatar.
      if (agentAvatar && img) {
        img.onerror = function () { img.style.display = 'none'; if (fb) fb.style.display = ''; };
        img.src = agentAvatar;
        img.style.display = '';
        if (fb) fb.style.display = 'none';
      } else {
        if (img) img.style.display = 'none';
        if (fb)  fb.style.display  = '';
      }
      if (title && agentName) title.textContent = agentName;
    } else {
      // Restore the bot identity.
      if (img) {
        img.onerror = null;
        img.src = currentAvatar();
        img.style.display = '';
      }
      if (fb) fb.style.display = 'none';
      if (title) title.textContent = cwLocalizeTitle(configData && configData.widget_title);
    }

    if (av) { // replay a quick swap animation
      av.style.animation = 'none';
      void av.offsetWidth;
      av.style.animation = 'cwAvatarSwap .5s ease';
    }
  }

  function playTakeoverAnimation(agentName) {
    removeTyping();
    removeConnecting();
    setLoading(false);
    const first = (agentName && String(agentName).trim())
      ? cwEscape(String(agentName).trim().split(/\s+/)[0])
      : '';

    const personSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

    const wrap = document.createElement('div');
    wrap.className = 'cw-takeover';
    const card = document.createElement('div');
    card.className = 'cw-takeover-card';

    const av = document.createElement('div');
    av.className = 'cw-takeover-avatar';
    if (agentAvatar) {
      const im = document.createElement('img');
      im.alt = '';
      im.onerror = function () { av.innerHTML = personSvg; }; // broken photo → icon
      im.src = agentAvatar;
      av.appendChild(im);
    } else {
      av.innerHTML = personSvg;
    }

    const txt = document.createElement('div');
    txt.className = 'cw-takeover-text';
    txt.innerHTML =
      '<strong>' + (first ? '<b>' + first + '</b> joined the chat' : 'A support agent joined') + '</strong>' +
      '<span>You’re now chatting with a person 👋</span>';

    card.appendChild(av);
    card.appendChild(txt);
    wrap.appendChild(card);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;

    setHeaderHuman(true);
    setStatus(first || 'Support agent');
  }

  // Visitor asked for a human and an agent is available — show a live "we're
  // connecting you" card that stays until the agent actually takes over.
  function playConnectingAnimation() {
    removeTyping();
    if (document.getElementById('cw-connecting')) return; // don't stack cards

    const personSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

    const wrap = document.createElement('div');
    wrap.className = 'cw-connecting';
    wrap.id = 'cw-connecting';
    wrap.innerHTML =
      '<div class="cw-connecting-card">' +
        '<div class="cw-connecting-avatar">' + personSvg + '</div>' +
        '<div class="cw-connecting-text">' +
          '<strong>' + cwEscape(cwT('connectingHuman')) + ' <span class="cw-conn-dots"><i></i><i></i><i></i></span></strong>' +
          '<span>' + cwEscape(CW_I18N_SUB[cwLang()] || CW_I18N_SUB.en) + '</span>' +
        '</div>' +
      '</div>';
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    setStatus('Connecting…');
  }

  function removeConnecting() {
    const el = document.getElementById('cw-connecting');
    if (el) el.remove();
  }

  function playHandbackAnimation() {
    const note = document.createElement('div');
    note.className = 'cw-handback';
    note.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' +
      '<span>AI assistant is back</span>';
    messages.appendChild(note);
    messages.scrollTop = messages.scrollHeight;

    setHeaderHuman(false);
    setStatus('Online');
  }

  // ── WebSocket (Pusher/Reverb) ─────────────────────────────────────────────────
  function loadPusher(callback) {
    if (window.Pusher) { callback(); return; }
    // Load order matters. Try OUR OWN origin first (same host as widget.js): a
    // strict CSP or an ad-blocker rule targeting js.pusher.com would otherwise
    // silently kill real-time (takeover, agent replies, typing) while AI chat
    // over SSE keeps working. Fall back to the public CDN, then one retry pass.
    var sources = [apiBase + '/vendor/pusher.min.js', 'https://js.pusher.com/8.2.0/pusher.min.js'];
    var i = 0, retried = false;
    (function attempt() {
      if (window.Pusher) { callback(); return; }
      if (i >= sources.length) {
        if (retried) return;            // both sources failed twice — give up quietly
        retried = true; i = 0;
        setTimeout(attempt, 2500);
        return;
      }
      var s = document.createElement('script');
      s.src = sources[i++];
      s.onload = function () { callback(); };
      s.onerror = attempt;              // next source (or the retry pass)
      document.head.appendChild(s);
    })();
  }

  // Re-fetch the transcript and append anything that landed while we were not
  // listening. Safe to call repeatedly: it only appends ids above the high-water
  // mark, so a spurious call renders nothing.
  //
  // This is the safety net behind the websocket. Without it, any gap in
  // connectivity — a deploy restarting Reverb, a laptop sleeping, a phone
  // switching networks — silently drops agent replies until a manual reload.
  async function resyncMissedMessages() {
    if (resyncing || !conversationId) return;
    const now = Date.now();
    if (now - lastResyncAt < 3000) return;   // focus/visibility can fire in bursts
    lastResyncAt = now;
    resyncing = true;
    try {
      const url = apiBase + '/api/widget/' + apiKey + '/config?visitor_id=' + encodeURIComponent(visitorId);
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      // A takeover or hand-back can also have happened while we were away, which
      // would otherwise leave the header showing the wrong party indefinitely.
      if (data.mode === 'human' && currentMode !== 'human') {
        currentMode = 'human';
        agentName   = (data.agent_name || '').trim();
        agentAvatar = data.agent_avatar || '';
        setHeaderHuman(true);
      } else if (data.mode === 'ai' && currentMode === 'human') {
        currentMode = 'ai';
        agentName   = '';
        agentAvatar = '';
        setHeaderHuman(false);
      }

      const msgs = Array.isArray(data.messages) ? data.messages : [];
      let appended = false;
      msgs.forEach(function (m) {
        if (!m.id || m.id <= lastMessageId) return;
        lastMessageId = m.id;
        // The visitor's own messages are already on screen from when they were
        // sent (and are echoed optimistically, before they have an id), so
        // replaying them here would duplicate every one.
        if (m.role === 'user') return;
        removeTyping();
        setLoading(false);
        addMessage(m.role, (m.is_agent && m.content_translated) ? m.content_translated : m.content, m.is_agent, m.created_at, m.reply_to, m.attachments);
        appended = true;
      });

      // Same treatment a live push would have got, so a caught-up reply still
      // chimes and still raises the closed-bubble notification.
      if (appended) {
        if (!isOpen) showReplyNotification('');
        else { markVisitorRead(); playChime(); }
      }
    } catch (e) {} finally {
      resyncing = false;
    }
  }

  function subscribeToConversation(convId) {
    if (!reverbConfig || pusherChannel) return;

    loadPusher(function () {
      if (pusherChannel) return;
      // Reuse one connection for the widget's whole lifetime. Creating a fresh
      // Pusher() on every subscribe (e.g. after "new chat") leaked a socket each
      // time and never closed the old one.
      if (!pusherClient) {
        pusherClient = new window.Pusher(reverbConfig.reverb_key, {
          wsHost:            reverbConfig.reverb_host,
          wsPort:            parseInt(reverbConfig.reverb_port, 10),
          wssPort:           parseInt(reverbConfig.reverb_port, 10),
          forceTLS:          reverbConfig.reverb_scheme === 'https',
          enabledTransports: ['ws', 'wss'],
          cluster:           'mt1',
          disableStats:      true,
        });

        // A dropped socket used to be fatal AND invisible: history is fetched once
        // on load and nothing ever re-fetched, so every message broadcast while the
        // connection was down was lost for good. Reverb terminates all connections
        // on restart, i.e. on every deploy, so this was routine rather than rare.
        // Catch up on re-connect (not on the first connect, which missed nothing).
        // Bound once on the shared connection, not per subscribe.
        pusherClient.connection.bind('state_change', function (states) {
          if (states.current !== 'connected') return;
          if (hasConnected) resyncMissedMessages();
          hasConnected = true;
        });
      }

      pusherChannel = pusherClient.subscribe('conversation.' + convId);
      startPresence();

      pusherChannel.bind('message.received', function (data) {
        if (!data.message) return;
        const msg = data.message;
        if (msg.id) lastMessageId = Math.max(lastMessageId, msg.id);
        if (msg.role === 'user') return;
        if (!msg.is_agent && currentMode !== 'human') return;
        removeTyping();
        setLoading(false);
        // msg.attachments matters here: an agent can send a photo, and without
        // this the visitor would get an empty bubble.
        // Agent replies are translated into the visitor's language on paid handoff
        // translation — prefer that when present, else the original text.
        addMessage(msg.role, (msg.is_agent && msg.content_translated) ? msg.content_translated : msg.content, msg.is_agent, msg.created_at, msg.reply_to, msg.attachments);
        // content is null when the agent sent only a photo — don't preview "null".
        const notifyText = (msg.content || '').trim()
          || ((msg.attachments && msg.attachments.length) ? '📷 Photo' : '');
        if (!isOpen) showReplyNotification(notifyText); // chimes inside
        else { markVisitorRead(); playChime(); }
      });

      // Operator took over (or handed back) — animate the handoff live.
      pusherChannel.bind('mode.changed', function (data) {
        if (!data || !data.mode) return;
        if (data.mode === 'human' && currentMode !== 'human') {
          currentMode = 'human';
          agentName   = (data.agent_name || '').trim();
          agentAvatar = data.agent_avatar || '';
          playTakeoverAnimation(agentName);
        } else if (data.mode === 'ai' && currentMode === 'human') {
          currentMode = 'ai';
          agentName = '';
          agentAvatar = '';
          playHandbackAnimation();
        } else {
          currentMode = data.mode;
        }
      });

      // Live "agent is typing…" indicator during a takeover.
      pusherChannel.bind('agent.typing', function (data) {
        if (!data || currentMode !== 'human') return;
        if (data.typing) showTyping(); else removeTyping();
      });
    });
  }

  // ── Config: fetched once on load; drives branding, teaser, and history ───────
  // Memoises the in-flight promise (not a boolean) so concurrent callers — e.g.
  // boot prefetch + init() on a reload with the chat already open — all await the
  // SAME fetch and receive the populated config, never a half-initialised null.
  // ── Per-page visibility ──────────────────────────────────────────────────
  // Owner rules: { mode: 'all'|'hide'|'show', patterns: ['/checkout*', ...] }.
  // hide = show everywhere EXCEPT matches (blocklist); show = ONLY matches (allowlist).
  function cwGlobMatch(pattern, path) {
    try {
      var pat = String(pattern).trim();
      // Accept a pasted full URL by stripping the origin down to a path.
      if (/^https?:\/\//i.test(pat)) { try { pat = new URL(pat).pathname; } catch (e) {} }
      if (pat.charAt(0) !== '/' && pat.charAt(0) !== '*') { pat = '/' + pat; }
      var rx = '^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
      var re = new RegExp(rx, 'i');
      return re.test(location.pathname) || re.test(location.pathname + location.search);
    } catch (e) { return false; }
  }
  // True when the current path is excluded by the embed's data-hide-on attribute.
  // Uses the same glob engine as page rules; safe to call before config loads.
  function cwAttrHidden() {
    return cwHidePaths.length > 0 && cwHidePaths.some(function (p) { return cwGlobMatch(p, location.pathname); });
  }
  function cwPageAllowed() {
    // Embed-level exclusions always win, independent of (and before) dashboard rules.
    if (cwAttrHidden()) return false;
    var r = configData && configData.page_rules;
    if (!r || !r.mode || r.mode === 'all' || !r.patterns || !r.patterns.length) return true;
    var matched = r.patterns.some(function (p) { return cwGlobMatch(p, location.pathname); });
    return r.mode === 'show' ? matched : !matched;
  }
  // Re-evaluate visibility on client-side (SPA) navigation, so the widget hides/
  // shows as the visitor moves between pages without a full reload.
  function cwApplyPageVisibility() {
    var allowed = configData && configData.active !== false && cwPageAllowed();
    if (allowed === widgetActive) return;
    widgetActive = allowed;
    container.style.display = widgetActive ? '' : 'none';
    if (!widgetActive) {
      try { closeChat(); } catch (e) {}
      var _g = document.getElementById('cw-greet'); if (_g) _g.remove();
      var _n = document.getElementById('cw-notif'); if (_n) _n.remove();
    }
  }
  function cwWatchNavigation() {
    if (cwWatchNavigation._done) return;
    cwWatchNavigation._done = true;
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m];
      if (typeof orig !== 'function') return;
      history[m] = function () { var out = orig.apply(this, arguments); try { cwApplyPageVisibility(); } catch (e) {} return out; };
    });
    window.addEventListener('popstate', cwApplyPageVisibility);
    window.addEventListener('hashchange', cwApplyPageVisibility);
  }

  function loadConfig() {
    if (configPromise) return configPromise;
    configPromise = (async function () {
      try {
        // Send the current page URL so the server can return a page-aware teaser.
        const pageUrl = location.origin + location.pathname;
        const url = apiBase + '/api/widget/' + apiKey + '/config?visitor_id=' + encodeURIComponent(visitorId) + '&url=' + encodeURIComponent(pageUrl);
        const res = await fetch(url);
        if (res.ok) {
          configData   = await res.json();
          reverbConfig = configData;
          currentMode  = configData.mode || 'ai';
          // Owner hid the widget from their site (globally, OR on this page via the
          // per-page rules) → keep the whole thing off-screen and suppress the
          // body-level greeting card / reply popover too.
          widgetActive = configData.active !== false && cwPageAllowed();
          container.style.display = widgetActive ? '' : 'none';
          if (!widgetActive) {
            var _g = document.getElementById('cw-greet'); if (_g) _g.remove();
            var _n = document.getElementById('cw-notif'); if (_n) _n.remove();
          }
          // Watch SPA navigation so the widget hides/shows as pages change.
          cwWatchNavigation();
          applyBranding(configData.primary_color, configData.widget_title);
          applyIcon(configData.bubble_icon || 'chat');
          applyLauncherStyle(configData.launcher_style || 'flat');
          applyPoweredBy(configData.show_branding);
          applyI18n();
          // First visit: branding is now correct, so reveal the launcher.
          revealWidget();
          // Restore the human agent's identity if a takeover is already active
          // (e.g. the visitor reloaded the page mid-conversation).
          if (currentMode === 'human') {
            agentName   = (configData.agent_name || '').trim();
            agentAvatar = configData.agent_avatar || '';
            setHeaderHuman(true);
          }
          if (currentMode !== 'human' && configData.avatar_url && headerAvatarImg) {
            headerAvatarImg.src = configData.avatar_url;
          }
          // Cache branding for an instant, flash-free paint on the next visit.
          try {
            localStorage.setItem('_cw_brand_' + apiKey, JSON.stringify({
              color:  configData.primary_color || '',
              avatar: configData.avatar_url || '',
              title:  configData.widget_title || '',
              icon:   configData.bubble_icon || '',
              style:  configData.launcher_style || '',
              branding: configData.show_branding !== false,
              active: configData.active !== false,
            }));
          } catch (e) {}
          if (configData.conversation_id) {
            conversationId = configData.conversation_id;
            subscribeToConversation(conversationId);
          }
        }
      } catch (e) {}
      return configData;
    })();
    return configPromise;
  }

  // ── Init: render the conversation on first open ──────────────────────────────
  // Memoised: returns the same promise on every call so callers (e.g. a greeting
  // chip that opens then sends) can await the welcome/history render reliably.
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async function () {
      await loadConfig();
      const data = configData || {};
      addMessage('bot', data.welcome_message || cwT('welcome'), false);

      // Conversation memory: restore the prior transcript for a returning visitor;
      // only a brand-new visitor sees the starter suggestions.
      if (Array.isArray(data.messages) && data.messages.length) {
        data.messages.forEach(function (m) {
          // Seeds the high-water mark so a later re-sync appends only what is
          // genuinely new rather than replaying the whole transcript.
          if (m.id) lastMessageId = Math.max(lastMessageId, m.id);
          // Replaying history: attachments too, or a past photo reopens as an
          // empty bubble.
          addMessage(m.role, (m.is_agent && m.content_translated) ? m.content_translated : m.content, m.is_agent, m.created_at, m.reply_to, m.attachments);
        });
      } else {
        renderSuggestions(data.suggested_questions);
      }
    })();
    return initPromise;
  }

  // ── Send message (streaming) ─────────────────────────────────────────────────
  function sendMessage(presetText) {
    const text = (typeof presetText === 'string' ? presetText : input.value).trim();

    // A file with no caption is a real message, so text alone can't gate this.
    // Anything still uploading blocks the send rather than being dropped.
    const atts = readyAttachments();
    if ((!text && !atts.length) || isLoading) return;
    if (pendingAttachments.some(function (a) { return a.pending; })) return;

    closeEmoji();
    stopRecording();
    removeSuggestions();
    unlockAudio();
    input.value = '';
    input.style.height = 'auto';
    pendingAttachments = [];
    renderAttachStrip();
    updateSendState();
    addMessage('user', text, false, null, null, atts);
    // The visitor has engaged — stop the proactive teaser for the rest of the session.
    try { sessionStorage.setItem('_cw_engaged', '1'); } catch (e) {}
    streamReply(text, atts.map(function (a) { return a.id; }));
  }

  // ── Emoji picker ─────────────────────────────────────────────────────────────
  const EMOJIS = ['😀','😃','😄','😁','😅','😂','🙂','😉','😊','😍','😘','😎','🤩','🤔','🤗','🙃','😴','😇','🥳','😢','😭','😡','👍','👎','👌','🙏','👏','🙌','💪','🤝','👋','✌️','🔥','✨','🎉','❤️','💯','✅','❌','⭐','💡','📞','📧','💬','🚀','🎁','💰','🎯'];

  function buildEmojiPanel() {
    if (emojiPanel.childElementCount) return;
    EMOJIS.forEach(function (e) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cw-emoji'; b.textContent = e;
      b.addEventListener('click', function () { insertAtCursor(input, e); input.focus(); });
      emojiPanel.appendChild(b);
    });
  }
  function insertAtCursor(el, txt) {
    const start = el.selectionStart != null ? el.selectionStart : el.value.length;
    const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
    el.value = el.value.slice(0, start) + txt + el.value.slice(end);
    const pos = start + txt.length;
    el.selectionStart = el.selectionEnd = pos;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    updateSendState();
  }
  function toggleEmoji() {
    buildEmojiPanel();
    const show = emojiPanel.hidden;
    emojiPanel.hidden = !show;
    emojiBtn.classList.toggle('cw-active', show);
  }
  function closeEmoji() {
    if (emojiPanel) emojiPanel.hidden = true;
    if (emojiBtn) emojiBtn.classList.remove('cw-active');
  }

  // ── Voice-to-text (Web Speech API) ───────────────────────────────────────────
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  // iOS Safari exposes webkitSpeechRecognition but does NOT support continuous
  // mode, and each start() must happen inside a user gesture (so the onend
  // auto-restart can't work). Detect iOS to run a single-shot session there.
  const CW_IS_IOS = /iP(hone|ad|od)/.test(navigator.platform || '') ||
    (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1) ||
    /iPhone|iPad|iPod/.test(navigator.userAgent || '');
  let recog = null, recording = false, voiceBase = '', origPlaceholder = '';
  // BCP-47 dictation locale. A localized widget's visitors usually speak that
  // language, even if their phone UI (navigator.language) is English — so prefer
  // the widget language and only fall back to the device locale for English.
  const CW_SPEECHLANG = {
    en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', pt: 'pt-BR', it: 'it-IT',
    nl: 'nl-NL', ar: 'ar-SA', tr: 'tr-TR', ru: 'ru-RU', pl: 'pl-PL', zh: 'zh-CN', ja: 'ja-JP',
  };
  function cwSpeechLang() {
    const l = cwLang();
    if (l && l !== 'en' && CW_SPEECHLANG[l]) return CW_SPEECHLANG[l];
    return navigator.language || 'en-US';
  }
  // Fallback voice for browsers without the Web Speech API (Firefox, some
  // webviews): record audio and transcribe it server-side (Gemini). Only used
  // when SpeechRecognition is absent — Chrome/Edge/Android keep the free path.
  const CAN_RECORD = !SpeechRec && !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let mediaRec = null, mediaChunks = [], mediaStream = null, recCapTimer = null;

  // Surface mic status/errors in the input placeholder (it otherwise fails silently).
  function micNote(msg, revert) {
    if (!origPlaceholder) origPlaceholder = input.getAttribute('placeholder') || 'Type a message…';
    input.setAttribute('placeholder', msg);
    if (revert) setTimeout(function () {
      if (input.getAttribute('placeholder') === msg) input.setAttribute('placeholder', origPlaceholder);
    }, 3500);
  }

  let voiceFinal = ''; // finalized transcript, accumulated across pauses/restarts

  if (SpeechRec && micBtn) {
    micBtn.hidden = false;
    recog = new SpeechRec();
    recog.lang = navigator.language || 'en-US';
    recog.interimResults = true;
    // Continuous keeps listening through pauses on Chrome/Android; iOS ignores it
    // and errors, so run single-shot there.
    recog.continuous = !CW_IS_IOS;
    recog.onresult = function (ev) {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) voiceFinal += t + ' ';
        else interim += t;
      }
      input.value = (voiceBase ? voiceBase + ' ' : '') + voiceFinal + interim;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      updateSendState();
    };
    // Chrome ends a session after a silence/timeout even in continuous mode —
    // restart it so dictation keeps going until the user actually clicks stop.
    recog.onend = function () {
      // Chrome/Android end a session on silence even in continuous mode — restart
      // it so dictation continues until the user taps stop. Never restart on iOS
      // (start() must be inside a user gesture there) — end the session cleanly.
      if (recording && !CW_IS_IOS) {
        try { recog.start(); return; } catch (e) { /* fall through to reset */ }
      }
      recording = false; // MUST reset, or the button stays stuck after one use
      micBtn.classList.remove('cw-recording');
      micBtn.setAttribute('aria-label', 'Voice to text');
      updateSendState();
    };
    recog.onerror = function (ev) {
      const err = ev && ev.error;
      if (err === 'not-allowed' || err === 'service-not-allowed') { recording = false; micNote('🎤 Microphone access is blocked — allow it in your browser', true); }
      else if (err === 'audio-capture') { recording = false; micNote('🎤 No microphone found', true); }
      else if (err === 'network') { recording = false; micNote('🎤 Voice needs an internet connection', true); }
      // 'no-speech' / 'aborted' → let onend decide (it restarts while recording is true)
    };
  }

  function startRecording() {
    if (!recog || recording) return;
    // SpeechRecognition only runs in a secure context (https or localhost).
    if (!window.isSecureContext) {
      micNote('🎤 Voice input needs a secure (https) page', true);
      return;
    }
    voiceBase = input.value.trim();
    voiceFinal = '';
    recording = true;
    try {
      try { recog.lang = cwSpeechLang(); } catch (e) {} // match the widget's language
      recog.start();
      micBtn.classList.add('cw-recording');
      micBtn.setAttribute('aria-label', 'Stop recording');
      updateSendState(); // shows the animated "Listening…" indicator
    } catch (e) {
      recording = false;
      updateSendState();
      micNote('🎤 Could not start the microphone', true);
    }
  }

  function stopRecording() {
    if (!recog) return;
    recording = false; // signal onend NOT to auto-restart
    micBtn.classList.remove('cw-recording');
    micBtn.setAttribute('aria-label', 'Voice to text');
    updateSendState(); // hides the "Listening…" indicator
    try { recog.stop(); } catch (e) {}
  }

  // ── MediaRecorder fallback (no Web Speech API) ───────────────────────────────
  if (CAN_RECORD && micBtn) micBtn.hidden = false;

  function pickAudioMime() {
    // Prefer formats the server transcriber accepts. Firefox → ogg/opus.
    var cands = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
      for (var i = 0; i < cands.length; i++) { if (MediaRecorder.isTypeSupported(cands[i])) return cands[i]; }
    }
    return '';
  }

  function releaseMic() {
    if (mediaStream) { try { mediaStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} mediaStream = null; }
  }

  async function startMediaRec() {
    if (recording) return;
    if (!window.isSecureContext) { micNote('🎤 Voice input needs a secure (https) page', true); return; }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      micNote('🎤 Microphone access is blocked — allow it in your browser', true);
      return;
    }
    voiceBase = input.value.trim();
    mediaChunks = [];
    var mime = pickAudioMime();
    try { mediaRec = mime ? new MediaRecorder(mediaStream, { mimeType: mime }) : new MediaRecorder(mediaStream); }
    catch (e) { try { mediaRec = new MediaRecorder(mediaStream); } catch (e2) { releaseMic(); micNote('🎤 Could not start the microphone', true); return; } }
    mediaRec.ondataavailable = function (ev) { if (ev.data && ev.data.size) mediaChunks.push(ev.data); };
    mediaRec.onstop = finishMediaRec;
    try { mediaRec.start(); } catch (e) { releaseMic(); micNote('🎤 Could not start the microphone', true); return; }
    recording = true;
    micBtn.classList.add('cw-recording');
    micBtn.setAttribute('aria-label', 'Stop recording');
    updateSendState(); // shows the animated "Listening…" indicator
    // Bound cost/abuse: auto-stop after 60s.
    recCapTimer = setTimeout(function () { if (recording) stopMediaRec(); }, 60000);
  }

  function stopMediaRec() {
    if (!mediaRec || !recording) return;
    recording = false;
    if (recCapTimer) { clearTimeout(recCapTimer); recCapTimer = null; }
    micBtn.classList.remove('cw-recording');
    micBtn.setAttribute('aria-label', 'Voice to text');
    updateSendState();
    try { mediaRec.stop(); } catch (e) { releaseMic(); } // stop → onstop → finishMediaRec
  }

  function finishMediaRec() {
    releaseMic();
    var type = (mediaRec && mediaRec.mimeType) || 'audio/ogg';
    var blob = new Blob(mediaChunks, { type: type });
    mediaChunks = [];
    if (!blob.size) return;
    micNote('🎤 Transcribing…'); // no auto-revert; cleared when the result lands
    var ext = type.indexOf('webm') !== -1 ? 'webm' : (type.indexOf('mp4') !== -1 ? 'mp4' : 'ogg');
    var fd = new FormData();
    fd.append('api_key', apiKey);
    fd.append('audio', blob, 'voice.' + ext);
    // Accept: json so a validation failure comes back as 422 JSON rather than a
    // 302 to the homepage, which fetch follows into a 200 HTML page.
    fetch(apiBase + '/api/chat/transcribe', { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        if (origPlaceholder) input.setAttribute('placeholder', origPlaceholder);
        var txt = d && d.text ? String(d.text).trim() : '';
        if (!txt) { micNote('🎤 Did not catch that — try again', true); return; }
        input.value = (voiceBase ? voiceBase + ' ' : '') + txt;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        updateSendState();
        try { input.focus(); } catch (e) {}
      })
      .catch(function () {
        if (origPlaceholder) input.setAttribute('placeholder', origPlaceholder);
        micNote('🎤 Voice transcription failed — try again', true);
      });
  }

  // Streams the AI reply token-by-token. Also used by Retry (which doesn't
  // re-add the user bubble, since it's already there).
  // Append bot-sent images (a product/page shot the AI chose) under a reply
  // bubble, reusing the visitor-attachment look. A dead/blocked URL drops itself
  // silently so we never show a broken-image icon.
  function appendBotImages(el, attachments) {
    if (!el || !attachments || !attachments.length) return;
    var imgs = attachments.filter(function (a) { return a && a.kind === 'image' && a.url; });
    if (!imgs.length) return;
    var box = document.createElement('div');
    box.className = 'cw-msg-atts';
    imgs.forEach(function (a) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cw-msg-att';
      btn.onclick = function () { openLightbox(a); };
      var img = document.createElement('img');
      img.src = a.url;
      img.alt = a.name || '';
      img.loading = 'lazy';
      img.onerror = function () { btn.remove(); if (!box.children.length) box.remove(); };
      btn.appendChild(img);
      box.appendChild(btn);
    });
    el.appendChild(box);
  }

  async function streamReply(text, attachmentIds) {
    lastUserText = text;
    // During a live human takeover the AI stays silent (the server streams no
    // tokens), so the "AI is typing" indicator here only made a phantom bubble
    // flash on every visitor message. Suppress the AI UI while a human owns the
    // chat; the message is still delivered to the agent by the POST below.
    const human = (currentMode === 'human');
    if (!human) { setLoading(true); showTyping(); }

    try {
      const res = await fetch(apiBase + '/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        // Still JSON + SSE: the file itself already went up separately, so only
        // its id rides along here and the stream is untouched.
        body: JSON.stringify({
          api_key: apiKey,
          visitor_id: visitorId,
          message: text,
          attachment_ids: attachmentIds || [],
        }),
      });
      if (!res.ok || !res.body) throw new Error('stream unavailable');

      let botEl = null, acc = '', errored = false;
      await readSSE(res.body, function (event, data) {
        if (event === 'token') {
          if (human) return; // a human is handling the chat — never render AI text
          removeTyping();
          if (!botEl) botEl = addMessage('assistant', '', false);
          acc += (data.t || '');
          botEl.innerHTML = renderMarkdown(acc);
          messages.scrollTop = messages.scrollHeight;
        } else if (event === 'done') {
          if (data.conversation_id) {
            conversationId = data.conversation_id;
            if (!pusherChannel) subscribeToConversation(conversationId);
          }
          // A product/page image the bot chose to show, appended under its reply.
          if (!human && botEl && data.attachments && data.attachments.length) {
            appendBotImages(botEl, data.attachments);
            messages.scrollTop = messages.scrollHeight;
          }
          currentMode = data.mode || currentMode;
          if (data.human_requested && data.agent_available) {
            // Agent is online: show the live "connecting you" card and skip the
            // usual email prompt (a real person is on the way).
            playConnectingAnimation();
          } else if (data.human_requested) {
            // Away hand-off: the reply invites the visitor to leave their email,
            // so always show the form here (even if it was shown earlier). The
            // "away" prompt tells them we'll reply by email — which the backend
            // does once the owner responds.
            maybeAskForEmail(true, true);
          } else if (!human) {
            maybeAskForEmail();
          }
        } else if (event === 'error') {
          errored = true;
        }
      });

      if (!human) { removeTyping(); setLoading(false); }
      if (errored && !botEl && !human) showError(text);
      // Reply done: popover + chime if the chat is closed, just a chime if open.
      if (!errored && acc) {
        if (!isOpen) showReplyNotification(acc); // chimes inside
        else playChime();
      }
    } catch (e) {
      if (!human) { removeTyping(); setLoading(false); showError(text); }
    }
  }

  // Parse a Server-Sent Events stream from a fetch ReadableStream body.
  async function readSSE(stream, onEvent) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buf += decoder.decode(chunk.value, { stream: true });
      let sep;
      while ((sep = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        let event = 'message', dataStr = '';
        raw.split('\n').forEach(function (line) {
          if (line.indexOf('event:') === 0) event = line.slice(6).trim();
          else if (line.indexOf('data:') === 0) dataStr += line.slice(5).trim();
        });
        if (dataStr) {
          let data; try { data = JSON.parse(dataStr); } catch (e) { data = {}; }
          onEvent(event, data);
        }
      }
    }
  }

  // Failed send → inline Retry that re-streams the same text.
  function showError(retryText) {
    const b = makeBotWrap();
    const el = document.createElement('div');
    el.className = 'cw-msg cw-bot';
    el.appendChild(document.createTextNode('Something went wrong. '));
    const btn = document.createElement('button');
    btn.className = 'cw-retry';
    btn.type = 'button';
    btn.textContent = 'Retry';
    btn.addEventListener('click', function () { b.wrap.remove(); streamReply(retryText); });
    el.appendChild(btn);
    b.line.appendChild(el);
    messages.appendChild(b.wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  // ── Lead capture ─────────────────────────────────────────────────────────────
  function maybeAskForEmail(force, away) {
    if (configData && configData.collect_email === false) return; // owner disabled lead capture
    if (localStorage.getItem('_cw_lead') === '1') return;         // visitor already left an email
    if (leadAsked && !force) return;                              // general capture: only once
    // Avoid stacking duplicates; re-render at the bottom (under the latest message).
    const existing = messages.querySelector('.cw-lead');
    if (existing) existing.remove();
    leadAsked = true;
    renderLeadForm(away);
  }

  function renderLeadForm(away) {
    const wrap = document.createElement('div');
    wrap.className = 'cw-lead';
    const t = document.createElement('div');
    t.className = 'cw-lead-text';
    t.textContent = away ? cwLeadAway() : cwT('leadPrompt');
    wrap.appendChild(t);

    // Fields the owner configured (already filtered to the enabled ones by the
    // backend). Fall back to a single email field if the config is missing.
    const fields = (configData && Array.isArray(configData.lead_fields) && configData.lead_fields.length)
      ? configData.lead_fields
      : [{ key: 'email', label: cwT('leadEmail'), type: 'email', required: true, options: [] }];

    const fieldsWrap = document.createElement('div');
    fieldsWrap.className = 'cw-lead-fields';
    const controls = [];

    fields.forEach(function (f) {
      const label = cwFieldLabel(f) + (f.required ? ' *' : '');
      let el;
      if (f.type === 'select') {
        el = document.createElement('select');
        el.className = 'cw-lead-input';
        const ph = document.createElement('option');
        ph.value = ''; ph.textContent = label || '—'; ph.selected = true;
        el.appendChild(ph);
        (f.options || []).forEach(function (o) {
          const opt = document.createElement('option');
          opt.value = o; opt.textContent = o;
          el.appendChild(opt);
        });
      } else {
        el = document.createElement('input');
        el.type = f.type === 'email' ? 'email' : (f.type === 'tel' ? 'tel' : 'text');
        el.className = 'cw-lead-input';
        el.placeholder = label;
      }
      fieldsWrap.appendChild(el);
      controls.push({ field: f, el: el });
    });
    wrap.appendChild(fieldsWrap);

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cw-lead-btn cw-lead-btn-full'; btn.textContent = cwT('send');
    wrap.appendChild(btn);

    function isEmail(v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }

    function submit() {
      const payload = {};
      let ok = true, firstBad = null;
      controls.forEach(function (c) {
        const v = (c.el.value || '').trim();
        c.el.style.borderColor = '';
        if (!v) {
          if (c.field.required) { ok = false; if (!firstBad) firstBad = c.el; c.el.style.borderColor = '#ef4444'; }
          return;
        }
        if (c.field.type === 'email' && !isEmail(v)) { ok = false; if (!firstBad) firstBad = c.el; c.el.style.borderColor = '#ef4444'; return; }
        payload[c.field.key] = v;
      });
      // Require at least one value even when nothing is marked required.
      if (ok && Object.keys(payload).length === 0 && controls.length) {
        ok = false; firstBad = controls[0].el; controls[0].el.style.borderColor = '#ef4444';
      }
      if (!ok) { if (firstBad && firstBad.focus) firstBad.focus(); return; }

      btn.disabled = true; btn.textContent = '…';
      // Record the page the visitor left their details on, as the lead's source.
      let pageUrl = '';
      try { pageUrl = (window.location && window.location.href || '').slice(0, 2048); } catch (e) {}
      fetch(apiBase + '/api/widget/' + apiKey + '/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, fields: payload, page_url: pageUrl }),
      }).then(function (r) {
        if (!r.ok) throw new Error('bad');
        localStorage.setItem('_cw_lead', '1');
        wrap.textContent = '';
        const done = document.createElement('div');
        done.className = 'cw-lead-text';
        done.textContent = cwT('leadThanks');
        wrap.appendChild(done);
      }).catch(function () { btn.disabled = false; btn.textContent = cwT('send'); });
    }

    btn.addEventListener('click', submit);
    controls.forEach(function (c) {
      if (c.el.tagName === 'INPUT') {
        c.el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      }
    });

    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  // ── Open / close ─────────────────────────────────────────────────────────────
  function openChat() {
    if (isOpen) return;
    unlockAudio();
    isOpen = true;
    panel.classList.add('cw-open');
    bubble.classList.add('cw-bubble-open');
    bubble.setAttribute('aria-label', 'Close chat');
    localStorage.setItem('_cw_open', '1');
    clearUnread();
    dismissGreeting();
    dismissNotif();
    stopReengage();
    init();
    startPresence();
    setTimeout(function () { input.focus(); markVisitorRead(); }, 400);
  }

  // Open the panel and immediately send a starter question (from a greeting chip).
  function openChatAndSend(q) {
    openChat();
    init().then(function () { sendMessage(q); });
  }

  function closeChat() {
    isOpen = false;
    closeMenu();
    closeEmoji();
    stopRecording();
    panel.classList.remove('cw-open');
    bubble.classList.remove('cw-bubble-open');
    bubble.setAttribute('aria-label', 'Open chat');
    localStorage.setItem('_cw_open', '0');
    scheduleReengage(); // closed again → re-attract after the idle delay
  }

  // ── Quick Actions menu ───────────────────────────────────────────────────────
  function openMenu() {
    updateSoundLabel();
    const lbl = document.getElementById('cw-menu-expand-label');
    if (lbl) lbl.textContent = panel.classList.contains('cw-expanded') ? cwT('collapseView') : cwT('expandView');
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    if (menu) menu.hidden = true;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu() {
    if (menu.hidden) openMenu(); else closeMenu();
  }

  function updateSoundLabel() {
    const el = document.getElementById('cw-menu-sound-label');
    if (el) el.textContent = soundOn ? cwT('soundOn') : cwT('soundOff');
  }

  function toggleExpand() {
    const expanded = panel.classList.toggle('cw-expanded');
    const lbl = document.getElementById('cw-menu-expand-label');
    if (lbl) lbl.textContent = expanded ? cwT('collapseView') : cwT('expandView');
  }

  function toggleSound() {
    soundOn = !soundOn;
    try { localStorage.setItem('_cw_sound', soundOn ? '1' : '0'); } catch (e) {}
    if (soundOn) { unlockAudio(); playChime(); } // confirm with a quick chime
    updateSoundLabel();
  }

  // Start a fresh thread: rotate the visitor id (so the server opens a new
  // conversation), clear the transcript, and re-render welcome + suggestions.
  function newConversation() {
    visitorId = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem('_cw_vid', visitorId); } catch (e) {}
    // Leave the old conversation's channel before opening a new thread, reusing
    // the one shared connection rather than leaking a socket per "new chat".
    if (pusherClient && conversationId) {
      try { pusherClient.unsubscribe('conversation.' + conversationId); } catch (e) {}
    }
    conversationId = null;
    pusherChannel = null;
    currentMode = 'ai';
    leadAsked = false;
    try { localStorage.removeItem('_cw_lead'); } catch (e) {}
    clearUnread();
    messages.innerHTML = '';
    suggestionsEl = null;
    typingEl = null;
    const data = configData || {};
    addMessage('bot', data.welcome_message || cwT('welcome'), false);
    renderSuggestions(data.suggested_questions);
    initPromise = Promise.resolve(); // already rendered; don't let init() re-render
    setTimeout(function () { input.focus(); }, 50);
  }

  function renderBadge() {
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.style.display = unread > 0 ? 'flex' : 'none';
    bubble.classList.toggle('cw-has-unread', unread > 0); // hide the online dot under the badge
  }
  function bumpUnread() {
    unread++;
    renderBadge();
    // Persist so the unread state survives a page reload (until the chat is opened).
    try { localStorage.setItem('_cw_unread', String(unread)); } catch (e) {}
  }
  function clearUnread() {
    unread = 0;
    renderBadge();
    try { localStorage.removeItem('_cw_unread'); localStorage.removeItem('_cw_unread_msg'); } catch (e) {}
  }

  // ── Proactive greeting ───────────────────────────────────────────────────────
  // True once the visitor explicitly closed a greeting card (the ×) this
  // session: reloads and same-tab navigations stay quiet. Opening/closing the
  // chat itself does NOT set this — only a deliberate dismissal does.
  function greetMuted() {
    try { return sessionStorage.getItem('_cw_greet_off') === '1'; } catch (e) { return false; }
  }

  // True when there's no reason to show a greeting (already open/shown/seen, or
  // there's no greeting content to display).
  function greetDone() {
    if (isOpen || document.getElementById('cw-greet') || document.getElementById('cw-notif')) return true;
    if (greetMuted()) return true;
    // Stop teasing only once the visitor has actually chatted this session (sent a
    // message). Merely opening/closing the widget does NOT count — so the teaser
    // keeps greeting them on each new page until they engage (max attention).
    try { if (sessionStorage.getItem('_cw_engaged') === '1') return true; } catch (e) {}
    // A pending unread reply takes precedence over a fresh greeting.
    try { if (parseInt(localStorage.getItem('_cw_unread') || '0', 10) > 0) return true; } catch (e) {}
    return !greetingText();
  }

  function greetingText() {
    const d = configData || {};
    const t = (d.teaser_message || '').trim();
    return t || (d.welcome_message || '').trim() || cwT('greeting');
  }

  // Build and show the greeting card: avatar + name, typing dots that resolve
  // into the message, then one-tap starter chips. Pass {force:true} for the
  // re-engagement teaser (bypasses the once-per-session gate). Returns whether
  // the card was actually shown.
  // The site's home page: root path (also treats /index.html and trailing
  // slashes as home). Used to keep the teaser to the home page when the owner
  // has enabled that.
  function isHomePage() {
    var p = (location.pathname || '/').replace(/\/index\.(html?|php)$/i, '/').replace(/\/+$/, '');
    return p === '' || p === '/';
  }

  function showGreeting(opts) {
    opts = opts || {};
    if (!widgetActive) return false;
    // Owner setting: keep the proactive teaser to the home page only.
    if (configData && configData.teaser_home_only && !isHomePage()) return false;
    // Hard blockers always apply: chat open, a card already up, or a pending reply.
    if (isOpen || document.getElementById('cw-greet') || document.getElementById('cw-notif')) return false;
    try { if (parseInt(localStorage.getItem('_cw_unread') || '0', 10) > 0) return false; } catch (e) {}
    // Never tease a visitor who's already chatting this session (even re-engagement).
    try { if (sessionStorage.getItem('_cw_engaged') === '1') return false; } catch (e) {}
    // An explicit dismissal (×) also blocks forced re-engagement teasers.
    if (greetMuted()) return false;
    // Once-per-page gate only for the initial (non-forced) greeting.
    if (!opts.force && greetDone()) return false;
    const d = configData || {};

    const card = document.createElement('div');
    card.id = 'cw-greet';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Chat invitation');
    // Flip the greeting card to RTL from the WIDGET's language (not the host
    // page's dir), so an Arabic/Hebrew widget reads correctly even on an LTR
    // site: close button, status dot, bubble tail and chip alignment all follow.
    card.setAttribute('dir', CW_RTL.indexOf(cwLang()) !== -1 ? 'rtl' : 'ltr');

    const x = document.createElement('button');
    x.id = 'cw-greet-x'; x.type = 'button';
    x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×';
    x.addEventListener('click', function (e) {
      e.stopPropagation();
      // Deliberate close: stay quiet for the rest of the session (reloads and
      // other pages included) — popping back up after a × is hostile on mobile.
      try { sessionStorage.setItem('_cw_greet_off', '1'); } catch (err) {}
      dismissGreeting();
    });

    const head = document.createElement('div');
    head.className = 'cw-greet-head';
    head.appendChild(avatarEl('cw-greet-av', 'cw-greet-av cw-greet-fb'));
    const name = document.createElement('div');
    name.className = 'cw-greet-name';
    name.appendChild(document.createTextNode(cwLocalizeTitle(d.widget_title)));
    const sub = document.createElement('small');
    sub.textContent = cwT('online');
    name.appendChild(sub);
    head.appendChild(name);

    const body = document.createElement('div');
    body.className = 'cw-greet-body';
    const bubble2 = document.createElement('div');
    bubble2.className = 'cw-greet-bubble';
    const dots = document.createElement('div');
    dots.className = 'cw-typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    bubble2.appendChild(dots);
    body.appendChild(bubble2);
    body.addEventListener('click', function () { openChat(); });

    card.appendChild(x);
    card.appendChild(head);
    card.appendChild(body);
    document.body.appendChild(card);

    // Draw the eye with a one-shot launcher wiggle. (No unread badge — that's
    // reserved for real replies; bumping it here would block re-engagement.)
    nudgeLauncher();

    // Resolve the typing dots into the greeting text, then reveal starter chips.
    setTimeout(function () {
      if (!document.body.contains(card)) return;
      bubble2.textContent = opts.message || greetingText();

      const chips = (d.suggested_questions || []).filter(Boolean).slice(0, 3);
      if (chips.length) {
        const box = document.createElement('div');
        box.className = 'cw-greet-chips';
        chips.forEach(function (q) {
          const c = document.createElement('button');
          c.type = 'button'; c.className = 'cw-greet-chip'; c.textContent = q;
          c.addEventListener('click', function (e) {
            e.stopPropagation();
            dismissGreeting();
            openChatAndSend(q);
          });
          box.appendChild(c);
        });
        card.appendChild(box);
      }
    }, 950);
    return true;
  }

  function dismissGreeting() {
    const g = document.getElementById('cw-greet');
    if (!g) return;
    g.classList.add('cw-greet-out');
    setTimeout(function () { g.remove(); }, 230);
  }

  // ── Attention timeline: escalating, well-spaced nudges while the chat stays
  // closed and the visitor hasn't engaged. Backs off so it never spams, and stops
  // the instant they open the chat or send a message.
  let attnTimers = [];
  let reengageCount = 0;
  const REENGAGE_MAX = 4;

  // No attention while the chat's open, the visitor has chatted, or a real reply
  // is already waiting (that has its own notification).
  function attnBlocked() {
    if (isOpen || !widgetActive) return true;
    try { if (sessionStorage.getItem('_cw_engaged') === '1') return true; } catch (e) {}
    try { if (parseInt(localStorage.getItem('_cw_unread') || '0', 10) > 0) return true; } catch (e) {}
    return false;
  }

  function pulseRing() {
    if (attnBlocked()) return;
    bubble.classList.remove('cw-attn-ring'); void bubble.offsetWidth; bubble.classList.add('cw-attn-ring');
    nudgeLauncher();
    setTimeout(function () { bubble.classList.remove('cw-attn-ring'); }, 3200);
  }
  function wiggle() {
    if (attnBlocked()) return;
    bubble.classList.remove('cw-wiggle'); void bubble.offsetWidth; bubble.classList.add('cw-wiggle');
    setTimeout(function () { bubble.classList.remove('cw-wiggle'); }, 2000);
  }
  function showAttnBadge() {
    if (attnBlocked() || document.getElementById('cw-attn-badge')) return;
    const b = document.createElement('span');
    b.id = 'cw-attn-badge'; b.textContent = '1';
    bubble.appendChild(b);
  }
  function removeAttnBadge() {
    const b = document.getElementById('cw-attn-badge'); if (b) b.remove();
  }
  function reTeaser() {
    if (attnBlocked() || reengageCount >= REENGAGE_MAX) return;
    var reMsgs = cwT('reengage');
    if (showGreeting({ force: true, message: reMsgs[reengageCount % reMsgs.length] })) reengageCount++;
  }
  function attnAt(delay, fn) { attnTimers.push(setTimeout(function () { if (!attnBlocked()) fn(); }, delay)); }

  // Start (or restart) the ladder from "now" (chat just loaded or was closed).
  function scheduleReengage() {
    stopReengage();
    if (attnBlocked()) return;
    attnAt(30 * 1000, pulseRing);                                  // 30s: ring + bounce
    attnAt(45 * 1000, showAttnBadge);                              // 45s: "1" badge (sticks)
    attnAt(75 * 1000, function () { reTeaser(); if (!greetMuted()) playChime(); });   // 75s: re-teaser + chime
    attnAt(180 * 1000, wiggle);                                    // 3m:  wiggle re-draws the eye
    attnAt(300 * 1000, reTeaser);                                  // 5m:  re-teaser
    // 9m onward: a gentle nudge every ~4m, capped by REENGAGE_MAX re-teasers.
    let n = 0;
    const loop = function () {
      if (attnBlocked() || reengageCount >= REENGAGE_MAX) return;
      nudgeLauncher();
      if (n % 2 === 1) reTeaser();
      n++;
      attnTimers.push(setTimeout(loop, 4 * 60 * 1000));
    };
    attnTimers.push(setTimeout(loop, 9 * 60 * 1000));
  }
  function stopReengage() { attnTimers.forEach(clearTimeout); attnTimers = []; removeAttnBadge(); }

  function nudgeLauncher() {
    bubble.classList.remove('cw-nudge');
    // reflow so the animation can restart if it was already applied
    void bubble.offsetWidth;
    bubble.classList.add('cw-nudge');
    setTimeout(function () { bubble.classList.remove('cw-nudge'); }, 1000);
  }

  // Create/resume the audio context on a user gesture so a notification chime
  // can play later (browsers block audio until the page has been interacted with).
  function unlockAudio() {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  // A soft two-note chime, synthesised (no audio file needed).
  function playChime() {
    if (!soundOn) return;
    unlockAudio();          // lazily create/resume the context if needed
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      [[880, 0], [1174.66, 0.12]].forEach(function (n) {
        const freq = n[0], t = n[1];
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.12, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.32);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.34);
      });
    } catch (e) {}
  }

  // Pretty popover shown near the launcher when a reply arrives while the chat
  // is closed — previews the message, bumps the unread badge, nudges the bubble.
  // Pass {restore:true} to re-show a persisted unread reply after a page reload
  // (skips re-counting the badge and the chime).
  function showReplyNotification(text, opts) {
    opts = opts || {};
    if (isOpen || !widgetActive) return;
    // Plain-text preview: strip markdown so the popover reads cleanly.
    const clean = String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/[#>*_~`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;

    const old = document.getElementById('cw-notif');
    if (old) old.remove();

    const d = configData || {};
    const card = document.createElement('div');
    card.id = 'cw-notif';
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'New message — open chat');
    // Match the greeting card: flip the reply popover to RTL from the widget's
    // own language so an Arabic/Hebrew reply notification reads correctly.
    card.setAttribute('dir', CW_RTL.indexOf(cwLang()) !== -1 ? 'rtl' : 'ltr');

    const x = document.createElement('button');
    x.id = 'cw-notif-x'; x.type = 'button';
    x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×';
    // Explicit dismiss = acknowledged: clear the badge so it doesn't return on reload.
    x.addEventListener('click', function (e) { e.stopPropagation(); clearUnread(); dismissNotif(); });

    const head = document.createElement('div');
    head.className = 'cw-notif-head';
    head.appendChild(avatarEl('cw-greet-av', 'cw-greet-av cw-greet-fb'));
    const name = document.createElement('div');
    name.className = 'cw-notif-name';
    name.appendChild(document.createTextNode(cwLocalizeTitle(d.widget_title)));
    const sub = document.createElement('small');
    sub.textContent = 'New message';
    name.appendChild(sub);
    head.appendChild(name);

    const msg = document.createElement('div');
    msg.className = 'cw-notif-msg';
    msg.textContent = clean;

    card.appendChild(x);
    card.appendChild(head);
    card.appendChild(msg);
    card.addEventListener('click', function () { dismissNotif(); openChat(); });
    document.body.appendChild(card);

    nudgeLauncher();
    if (!opts.restore) {
      bumpUnread();
      playChime();
      try { localStorage.setItem('_cw_unread_msg', clean); } catch (e) {}
    }

    // Auto-hide the popover after a while; the unread badge stays until opened.
    clearTimeout(notifTimer);
    notifTimer = setTimeout(function () { dismissNotif(); }, 9000);
  }

  function dismissNotif() {
    clearTimeout(notifTimer);
    const n = document.getElementById('cw-notif');
    if (!n) return;
    n.classList.add('cw-greet-out');
    setTimeout(function () { n.remove(); }, 230);
  }

  // Auto-opening greetings are intentionally disabled so the widget stays closed
  // until the visitor clicks the launcher. The original engagement-based logic is
  // kept in place only for reference, but the function now no-ops.
  function armGreeting() {
    return false;
  }

  // Smart timing: show the greeting on the first engagement signal after a short
  // grace period, with a guaranteed fallback so it always appears once. Signals
  // cover desktop AND mobile (touch, upward-scroll hesitation), and returning
  // visitors are nudged a little sooner. Fires at most once per session.
  function armGreetingLegacy() {
    if (!widgetActive || greetDone()) return;

    // Returning visitors already know the site — reveal a bit sooner.
    let visits = 0;
    try {
      visits = parseInt(localStorage.getItem('_cw_visits') || '0', 10) || 0;
      localStorage.setItem('_cw_visits', String(visits + 1));
    } catch (e) {}
    const returning = visits > 0;

    let done = false;
    let armed = false;
    let lastY = window.scrollY || document.documentElement.scrollTop || 0;
    const offs = [];
    const cleanup = function () { offs.forEach(function (f) { f(); }); };
    const fire = function () {
      if (done) return;
      done = true;
      cleanup();
      showGreeting();
    };

    // Guaranteed fallback — always show, sooner for a returning visitor.
    const fallback = setTimeout(fire, returning ? 3000 : 5000);
    offs.push(function () { clearTimeout(fallback); });

    // Short grace period so we never pop instantly on a fresh pageview; after it,
    // the first sign of engagement reveals the greeting.
    const graceT = setTimeout(function () { armed = true; }, returning ? 800 : 1800);
    offs.push(function () { clearTimeout(graceT); });

    // Desktop: first mouse movement after the grace period.
    const onMove = function () { if (armed) fire(); };
    document.addEventListener('mousemove', onMove, { passive: true });
    offs.push(function () { document.removeEventListener('mousemove', onMove); });

    // Mobile: first touch (mousemove and exit-intent never fire on touch devices).
    const onTouch = function () { if (armed) fire(); };
    document.addEventListener('touchstart', onTouch, { passive: true });
    offs.push(function () { document.removeEventListener('touchstart', onTouch); });

    // Engagement: scrolled ~25% down, OR an upward scroll after the grace period
    // (a hesitation signal — the visitor is hunting for something; works on mobile).
    const onScroll = function () {
      if (!armed) return;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const scrolledUp = y < lastY - 40;
      lastY = y;
      if (h <= 0 || y / h > 0.25 || scrolledUp) fire();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    offs.push(function () { window.removeEventListener('scroll', onScroll); });

    // Exit-intent (desktop): mouse leaves toward the top of the viewport.
    const onExit = function (e) { if ((e.clientY || 0) <= 0) fire(); };
    document.addEventListener('mouseout', onExit);
    offs.push(function () { document.removeEventListener('mouseout', onExit); });
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  bubble.addEventListener('click', function () { isOpen ? closeChat() : openChat(); });
  closeBtn.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', function () { sendMessage(); });

  // Quick Actions menu
  menuBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });
  menu.addEventListener('click', function (e) {
    const item = e.target.closest('.cw-menu-item');
    if (!item) return;
    closeMenu();
    switch (item.getAttribute('data-act')) {
      case 'expand':   toggleExpand(); break;
      case 'new':      newConversation(); break;
      case 'sound':    toggleSound(); break;
      case 'minimize': closeChat(); break;
    }
  });
  // Emoji picker + voice-to-text
  emojiBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleEmoji(); });
  emojiPanel.addEventListener('click', function (e) { e.stopPropagation(); });
  if (micBtn) micBtn.addEventListener('click', function () {
    if (SpeechRec) { recording ? stopRecording() : startRecording(); }
    else if (CAN_RECORD) { recording ? stopMediaRec() : startMediaRec(); }
  });

  // Close the menu / emoji panel when clicking elsewhere or pressing Escape.
  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
      closeMenu();
    }
    if (!emojiPanel.hidden && !emojiPanel.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
      closeEmoji();
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); closeEmoji(); } });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    updateSendState();
    if (this.value.trim()) visitorTyping();
  });

  // Seeing the chat again (refocus / tab visible) marks the agent's messages read
  // and re-fires the presence heartbeat so the dashboard lights "online" instantly
  // instead of waiting up to 25s for the next interval tick.
  function onRefocus() {
    markVisitorRead();
    if (document.visibilityState === 'visible') {
      postActivity('presence');
      // Coming back is the single best moment to catch up: a sleeping laptop or
      // a backgrounded mobile tab is exactly when the socket dies unnoticed.
      resyncMissedMessages();
    }
  }
  document.addEventListener('visibilitychange', onRefocus);
  window.addEventListener('focus', onRefocus);

  // Slow safety net while a human is handling the chat. Even if the socket is
  // silently dead and no focus event ever fires, an agent's reply now surfaces
  // within ~20s instead of never. Cheap: one request, and only while a human is
  // actually on the other end with the tab in view.
  setInterval(function () {
    // Poll whenever the visitor has a live conversation and the tab is in view,
    // not only once we are ALREADY in human mode. The original condition never
    // caught the ai -> human takeover itself: if the socket was silently dead
    // (Reverb restarted by a deploy, connection dropped, Pusher script blocked)
    // and the visitor kept the tab focused, the handoff never surfaced. resync
    // self-throttles (3s) and no-ops when nothing is new, so this stays cheap.
    if (conversationId && document.visibilityState === 'visible') {
      resyncMissedMessages();
    }
  }, 20000);

  // Track "Powered by" referral clicks with a non-blocking beacon (the link still
  // opens normally in a new tab) so it never adds any latency.
  var cwPbLink = document.querySelector('#cw-powered a');
  if (cwPbLink) {
    cwPbLink.addEventListener('click', function () {
      try {
        var refUrl = apiBase + '/api/widget/' + apiKey + '/ref-click';
        if (navigator.sendBeacon) navigator.sendBeacon(refUrl);
        else fetch(refUrl, { method: 'POST', keepalive: true }).catch(function () {});
      } catch (e) {}
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  // Keep the widget available, but suppress the automatic greeting so it only
  // opens when the visitor clicks the launcher.
  loadConfig().then(function () {
    // Intentionally left empty: auto-popup greeting disabled.
  });

  // ── SPA support ──────────────────────────────────────────────────────────────
  // On single-page-app sites the page changes without a full reload, so re-fetch
  // the teaser for the new URL and re-arm the greeting (unless the chat is open or
  // the visitor already engaged). Patches history so pushState/replaceState
  // navigations are caught alongside back/forward.
  let cwPath = location.pathname;
  function refreshTeaser() {
    const pageUrl = location.origin + location.pathname;
    return fetch(apiBase + '/api/widget/' + apiKey + '/teaser?url=' + encodeURIComponent(pageUrl))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !configData) return;
        configData.teaser_message = d.teaser_message;
        if (Array.isArray(d.suggested_questions)) configData.suggested_questions = d.suggested_questions;
      })
      .catch(function () {});
  }
  let cwRouteT = null;
  function onRouteChange() {
    if (location.pathname === cwPath) return; // ignore query/hash-only changes
    cwPath = location.pathname;
    if (isOpen) return;
    try { if (sessionStorage.getItem('_cw_engaged') === '1') return; } catch (e) {}
    clearTimeout(cwRouteT);
    cwRouteT = setTimeout(function () {
      dismissGreeting();
      refreshTeaser().then(function () { armGreeting(); });
    }, 150);
  }
  ['pushState', 'replaceState'].forEach(function (m) {
    const orig = history[m];
    if (typeof orig !== 'function') return;
    history[m] = function () {
      const rv = orig.apply(this, arguments);
      try { window.dispatchEvent(new Event('cw:route')); } catch (e) {}
      return rv;
    };
  });
  window.addEventListener('popstate', function () { try { window.dispatchEvent(new Event('cw:route')); } catch (e) {} });
  window.addEventListener('cw:route', onRouteChange);

  // Conversation memory: reopen + restore if the visitor had the chat open.
  if (isOpen) {
    panel.classList.add('cw-open');
    bubble.classList.add('cw-bubble-open');
    bubble.setAttribute('aria-label', 'Close chat');
    clearUnread();
    init();
  } else {
    // Unread reply from a previous visit (chat was closed) → restore the badge,
    // and re-show the popover preview so a page reload doesn't lose the notice.
    const storedUnread = parseInt(localStorage.getItem('_cw_unread') || '0', 10);
    if (storedUnread > 0) {
      unread = storedUnread;
      renderBadge();
      let storedMsg = '';
      try { storedMsg = localStorage.getItem('_cw_unread_msg') || ''; } catch (e) {}
      if (storedMsg) {
        setTimeout(function () { showReplyNotification(storedMsg, { restore: true }); }, 600);
      }
    }
    // Chat is closed → start the idle re-engagement loop.
    scheduleReengage();
  }
  } catch (err) {
    // A failure on our side must never surface on the host page as a broken widget.
    // Log once, remove any half-built UI, and leave the customer's site untouched.
    try {
      console.error('[ChatWidget] disabled after an unexpected error:', err);
      var _root = document.getElementById('cw-widget-root');
      if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
      ['cw-greet', 'cw-notif'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    } catch (e) {}
  }
})();
