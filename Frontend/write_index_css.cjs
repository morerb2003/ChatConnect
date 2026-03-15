const fs = require('fs');
const content = @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700&display=swap');
@import  tailwindcss;

@layer base {
  :root {
    font-size: 16px;
    --page-padding: clamp(1rem, 2.5vw, 1.75rem);
    --card-radius: clamp(1.5rem, 2.5vw, 2.75rem);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    font-family: 'Manrope', 'Segoe UI', Tahoma, sans-serif;
    color: #0f1f25;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background:
      radial-gradient(1200px 700px at 0% 0%, #ffe4b8 0%, transparent 70%),
      radial-gradient(900px 600px at 100% 100%, #c5ffef 0%, transparent 70%),
      linear-gradient(180deg, #fff8eb, #e8fff7);
  }

  @media (max-width: 768px) {
    :root {
      font-size: 15px;
    }
  }

  @media (max-width: 480px) {
    :root {
      font-size: 14px;
    }
  }
}

@layer utilities {
  .scrollbar-slim {
    scrollbar-width: thin;
    scrollbar-color: rgba(15, 23, 42, 0.6) transparent;
  }

  .scrollbar-slim::-webkit-scrollbar {
    width: 5px;
  }

  .scrollbar-slim::-webkit-scrollbar-thumb {
    background-color: rgba(15, 23, 42, 0.6);
    border-radius: 999px;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
;
fs.writeFileSync('src/index.css', content);
