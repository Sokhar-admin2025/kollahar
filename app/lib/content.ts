// SOURCE OF TRUTH
// Denna fil innehåller all text för hela applikationen.
// Ändra här för att uppdatera text på alla sidor samtidigt.

export const DASHBOARD_TEXTS = {
  // --- GEMENSAMT / NAVIGATION ---
  navigation: {
    brand: "Kolla här!",
    myPage: "Min sida",
    sellBtn: "Sälj något"
  },

  // --- DASHBOARD (Min sida) ---
  header: {
    title: "Min Sida",
    welcome: "Inloggad som:",
    logout: "Logga ut"
  },
  ctaCard: {
    title: "Har du något nytt på gång?",
    subtitle: "Lägg upp en ny annons direkt.",
    button: "+ Sälj något"
  },
  tabs: {
    active: "Mina Annonser",
    history: "Mina sålda prylar"
  },
  emptyStates: {
    active: "Här ekar det tomt. Dags att rensa garaget?",
    history: "Du har inte sålt något via oss än. Men vi tror på dig! 🚀"
  },
  listing: {
    soldLabel: "Såld via oss ⭐",
    activeLabel: "Aktiv",
    noImage: "Ingen bild",
    deleteTitle: "Radera annons",
    historyHeaders: {
      datePublished: "Publicerad",
      title: "Rubrik",
      price: "Pris",
      dateSold: "Såld datum"
    }
  },
  deleteModal: {
    title: "Är du verkligen säker?? 💔",
    // Funktion för att baka in titeln dynamiskt
    description: (itemTitle: string) => `Du är på väg att ta bort **${itemTitle}**. Sista chansen att ångra sig! 💨`,
    question: "Bara av nyfikenhet, varför vill du ta bort annonsen?",
    options: {
      soldHere: "Såld här (Ni är bäst! ⭐)",
      soldElsewhere: "Såld någon annanstans (Jag var otrogen...)",
      justDelete: "Vill bara ta bort den (Inga frågor, tack)"
    },
    buttons: {
      cancel: "Jag ångrar mig!",
      confirm: "Sopar...",
      deleteNow: "Radera nu"
    }
  },

  // --- STARTSIDAN (Home) ---
  landing: {
    hero: {
      title: "Hitta fynd eller sälj det du inte behöver",
      subtitle: "Sveriges tryggaste marknadsplats för allt från elektronik till gamla möbler.", // Lite vassare text
      cta: "Lägg in en annons gratis"
    },
    search: {
      placeholder: "Vad letar du efter idag? (t.ex. Cykel)",
      filterTitle: "Kategorier:",
      categories: ["Alla", "Fordon", "Elektronik", "Kläder", "Möbler", "Övrigt"]
    },
    listings: {
      header: "Senaste annonserna",
      empty: "Inga annonser hittades som matchar din sökning. 🕵️‍♂️",
      locationPrefix: "📍",
      readMore: "Läs mer"
    },
    // NY FOOTER-STRUKTUR
    footer: {
      brand: "Kollahär!",
      copyright: "© 2026 Kollahär! Alla rättigheter reserverade.",
      columns: [
        {
          title: "Marknadsplatsen",
          links: ["Om oss", "Så funkar det", "Hållbarhet", "Press"]
        },
        {
          title: "Kundservice",
          links: ["Kontakta oss", "Vanliga frågor", "Trygg affär", "Cookies"]
        },
        {
          title: "Följ oss",
          links: ["Instagram", "Facebook", "LinkedIn", "TikTok"]
        }
      ]
    }
  },

  // --- DETALJSIDAN (Annons-sidan) ---
  details: {
    backToHome: "← Tillbaka till alla annonser",
    loading: "Laddar annons...",
    notFound: {
      title: "Annonsen hittades inte",
      link: "Gå till startsidan"
    },
    sections: {
      description: "Beskrivning",
      location: "Plats:",
      category: "Kategori:"
    },
    contact: {
      button: "Kontakta säljaren",
      alert: "Chatt-funktion kommer i nästa uppdatering! Just nu får du låtsas mejla säljaren."
    },
    noImage: "Ingen bild tillgänglig"
  },

  // --- SKAPA ANNONS (Create) ---
  create: {
    header: "Skapa ny annons",
    backLink: "← Tillbaka till dashboard",
    form: {
      title: { label: "Rubrik", placeholder: "T.ex. Röd racercykel" },
      category: { label: "Kategori", options: ["Fordon", "Elektronik", "Kläder", "Möbler", "Övrigt"] },
      price: { label: "Pris (kr)", placeholder: "0" },
      location: { label: "Plats", placeholder: "T.ex. Stockholm, Södermalm" },
      description: { label: "Beskrivning", placeholder: "Berätta om skicket, ålder och annat viktigt..." },
      image: { 
        label: "Bilder", 
        uploadBtn: "Välj bilder", 
        uploading: "Laddar upp...",
        errorTooMany: "Du kan max ladda upp 5 bilder. Ta bort en för att lägga till en ny.",
        errorTooBig: "Bilden är för stor! Max 2MB tillåts."
      }
    },
    submit: {
      btn: "Publicera annons",
      loading: "Skapar..."
    },
    success: "Annonsen publicerad! Skickar dig tillbaka..."
  }, // <--- HÄR VAR DET SOM SAKNADES (KOMMAT)

  // --- REDIGERA ANNONS (Edit) ---
  edit: {
    header: "Redigera annons",
    backLink: "← Avbryt",
    loadingData: "Hämtar annonsuppgifter...",
    submit: {
      btn: "Spara ändringar",
      loading: "Sparar..."
    },
    success: "Ändringarna sparade! Går tillbaka..."
  },
  // ... (behåll edit ovanför och se till att det slutar med ett kommatecken)

  // --- MEDDELANDEN (CHATT) ---
  messages: {
    navLabel: "Meddelanden",
    pageTitle: "Mina meddelanden",
    inbox: {
      empty: "Inga meddelanden än. Hitta något fint att köpa! 💌",
      loading: "Laddar konversationer...",
      you: "Du"
    },
    chat: {
      placeholder: "Skriv ett meddelande...",
      send: "Skicka",
      sending: "Skickar...",
      noSelection: "👈 Välj en konversation i listan för att läsa.",
      starter: "Här börjar er konversation om"
    },
    actions: {
      contactSeller: "Skicka meddelande",
      startChat: "Hej! Jag är intresserad av denna.", // Standardtext när man startar ny chatt
      loginToChat: "Logga in för att chatta"
    }
  },
  // ... (här slutar messages-blocket), <--- GLÖM INTE KOMMA HÄR OVANFÖR

  // --- INSTÄLLNINGAR & PROFIL ---
  settings: {
    title: "Inställningar",
    back: "← Tillbaka till Dashboard",
    sections: {
      profile: "Min Profil",
      privacy: "Integritet & Samtycke (GDPR)",
      password: "Byt lösenord"
    },
    form: {
      name: { label: "Namn / Företagsnamn", placeholder: "Ditt namn eller företag" },
      location: { label: "Min plats (Hemvist)", placeholder: "T.ex. Huddinge, Stockholm" },
      avatar: { label: "Profilbild / Logotyp", changeBtn: "Byt bild", uploading: "Laddar upp..." },
      consents: {
        marketing: "Jag godkänner att ni skickar nyhetsbrev och erbjudanden.",
        analytics: "Jag godkänner att ni samlar in anonym data för att förbättra tjänsten."
      }
    },
    save: {
      btn: "Spara ändringar",
      loading: "Sparar...",
      success: "Din profil har uppdaterats!"
    },
    password: {
      title: "Byt lösenord",
      description: "Av säkerhetsskäl behöver du bekräfta ditt nuvarande lösenord innan du väljer ett nytt.",
      currentLabel: "Nuvarande lösenord",
      newLabel: "Nytt lösenord",
      confirmLabel: "Bekräfta nytt lösenord",
      submit: "Uppdatera lösenord",
      loading: "Uppdaterar...",
      errors: {
        required: "Fyll i alla fält.",
        minLength: (min: number) => `Lösenordet måste vara minst ${min} tecken långt.`,
        mismatch: "Lösenorden matchar inte.",
        sameAsOld: "Det nya lösenordet måste vara annorlunda än det nuvarande.",
        currentInvalid: "Nuvarande lösenord är fel. Försök igen.",
        generic: "Kunde inte uppdatera lösenordet. Försök igen."
      },
      success: "Ditt lösenord har uppdaterats."
    }
  },

  // --- LOGIN & REGISTRERING ---
  auth: {
    login: {
      title: "Logga in",
      email: "E-post",
      password: "Lösenord",
      submit: "Logga in",
      forgotPassword: "Glömt lösenord?",
      loading: "Loggar in...",
      errors: {
        invalidCredentials: "Fel e-post eller lösenord. Försök igen.",
        networkError: "Nätverksfel. Kontrollera din anslutning.",
        invalidEmail: "Ogiltig e-postadress.",
        generic: "Ett fel uppstod. Försök igen."
      }
    },
    signup: {
      title: "Skapa konto",
      email: "E-post",
      password: "Lösenord",
      submit: "Skapa konto",
      loading: "Skapar konto...",
      passwordMinLength: (min: number) => `Lösenordet måste vara minst ${min} tecken långt.`,
      errors: {
        emailExists: "Användare med samma adress finns redan, registrera med ett nytt eller kör \"Glömt lösenord\".",
        weakPassword: "Lösenordet är för svagt. Använd minst 8 tecken.",
        invalidEmail: "Ogiltig e-postadress.",
        generic: "Kunde inte skapa konto. Försök igen."
      },
      success: "Konto skapat! Kontrollera din e-post för verifieringskod."
    },
    verify: {
      title: "Bekräfta din e-post",
      subtitle: "Vi har skickat en 6-siffrig kod till",
      codeLabel: "Verifieringskod",
      codePlaceholder: "000000",
      submit: "Verifiera",
      resend: "Skicka ny kod",
      back: "← Tillbaka",
      loading: "Verifierar...",
      resending: "Skickar ny kod...",
      countdown: (seconds: number) => `Koden är giltig i ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
      attemptsLeft: (attempts: number) => `Du har ${attempts} försök kvar.`,
      errors: {
        invalidCode: "Fel kod. Försök igen.",
        expiredCode: "Koden har gått ut. Skicka en ny kod.",
        tooManyAttempts: "För många felaktiga försök. Skicka en ny kod.",
        generic: "Ett fel uppstod. Försök igen."
      },
      success: "E-post verifierad! Loggar in..."
    },
    welcome: {
      title: "Välkommen till Kollahär!",
      subtitle: "Vad vill du göra idag?",
      browseAds: "Bläddra annonser",
      createAd: "Lägg upp en annons",
      goToProfile: "Gå till min profil",
      dontShowAgain: "Visa inte detta igen",
      close: "Stäng"
    }
  },
} // <-- Filens slut