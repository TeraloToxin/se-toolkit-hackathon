import { useState, useEffect } from 'react';
import './App.css';

const API_URL = '/api';

// ─── Переводы ───
const TRANSLATIONS = {
  ru: {
    subtitle: 'Умный учёт расходов',
    textEntry: '⚡ Ввод текстом',
    placeholder: 'Например: "Потратил 450₽ на такси"',
    quickAdd: '➕ Быстрый ввод',
    templates: '⚡ Шаблоны',
    history: '📋 История транзакций',
    amount: 'Сумма',
    vendor: 'Продавец',
    category: 'Категория',
    date: 'Дата',
    addExpense: '💾 Добавить расход',
    cancel: '✕ Отмена',
    newTemplate: '＋ Новый',
    templateName: 'Название',
    templateAmount: 'Сумма (₽)',
    saveTemplate: '📌 Сохранить шаблон',
    noTemplates: 'Нет шаблонов. Создайте первый!',
    noTransactions: 'Пока нет расходов. Введите первый!',
    deleteTemplate: 'Удалить шаблон',
    processing: '⏳',
    shopPlaceholder: 'Магазин',
    lunchName: 'Обед',
    lunchVendor: 'Столовая',
    metroName: 'Метро',
    metroVendor: 'Московский Метро',
    taxiName: 'Такси',
    taxiVendor: 'Яндекс Такси',
    groceriesName: 'Продукты',
    groceriesVendor: 'Пятёрочка',
    fillAll: 'Заполните все поля',
    saveError: 'Ошибка сохранения',
    tplError: 'Ошибка создания шаблона',
    processError: 'Ошибка обработки',
    valMissingAmount: '⚠️ Укажите сумму расхода (число, например 500 или 500₽)',
    valMissingVendor: '⚠️ Укажите продавца/магазин (например: Пятёрочка, Додо, Такси)',
    valMissingCategory: '⚠️ Укажите категорию расхода (еда, такси, метро, продукты и т.д.)',
    aiNotFound: '⚠️ ИИ не нашёл расход. Попробуйте написать конкретнее (укажите сумму и что купили).',
    thDate: 'Дата',
    thCategory: 'Категория',
    thVendor: 'Продавец',
    thAmount: 'Сумма',
  },
  en: {
    subtitle: 'Smart Expense Tracker',
    textEntry: '⚡ Text Entry',
    placeholder: 'E.g.: "Spent $12 on pizza and drinks"',
    quickAdd: '➕ Quick Add',
    templates: '⚡ Templates',
    history: '📋 Transaction History',
    amount: 'Amount',
    vendor: 'Vendor',
    category: 'Category',
    date: 'Date',
    addExpense: '💾 Add Expense',
    cancel: '✕ Cancel',
    newTemplate: '＋ New',
    templateName: 'Name',
    templateAmount: 'Amount ($)',
    saveTemplate: '📌 Save Template',
    noTemplates: 'No templates yet. Create one!',
    noTransactions: 'No expenses yet. Add your first one!',
    deleteTemplate: 'Delete template',
    processing: '⏳',
    shopPlaceholder: 'Shop name',
    lunchName: 'Lunch',
    lunchVendor: 'Cafeteria',
    metroName: 'Metro',
    metroVendor: 'City Metro',
    taxiName: 'Taxi',
    taxiVendor: 'Uber',
    groceriesName: 'Groceries',
    groceriesVendor: 'Walmart',
    fillAll: 'Fill in all fields',
    saveError: 'Save error',
    tplError: 'Template creation error',
    processError: 'Processing error',
    valMissingAmount: '⚠️ Specify the expense amount (a number, e.g. 500 or $12)',
    valMissingVendor: '⚠️ Specify the vendor/store (e.g. Pyaterochka, Dodo, Taxi)',
    valMissingCategory: '⚠️ Specify the expense category (food, taxi, metro, groceries, etc.)',
    aiNotFound: '⚠️ AI couldn\'t find an expense. Try to be more specific (include amount and what you bought).',
    thDate: 'Date',
    thCategory: 'Category',
    thVendor: 'Vendor',
    thAmount: 'Amount',
  },
};

const CATEGORIES = [
  { value: 'Food', emoji: '🍕', color: '#ff6b6b' },
  { value: 'Transport', emoji: '🚗', color: '#4ecdc4' },
  { value: 'Shopping', emoji: '🛍️', color: '#a29bfe' },
  { value: 'Rent', emoji: '🏠', color: '#fdcb6e' },
  { value: 'Entertainment', emoji: '🎬', color: '#e17055' },
  { value: 'Healthcare', emoji: '💊', color: '#00b894' },
  { value: 'Utilities', emoji: '⚡', color: '#0984e3' },
  { value: 'Services', emoji: '🔧', color: '#636e72' },
  { value: 'Groceries', emoji: '🛒', color: '#2ecc71' },
  { value: 'Restaurant', emoji: '🍽️', color: '#e84393' },
];

function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('sw-lang') || 'ru');
  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const toggleLang = () => {
    const next = lang === 'ru' ? 'en' : 'ru';
    setLang(next);
    localStorage.setItem('sw-lang', next);
  };

  const DEFAULT_TEMPLATES = [
    { name: t('lunchName'), amount: 350, category: 'Food', vendor: t('lunchVendor'), icon: '🍕' },
    { name: t('metroName'), amount: 49, category: 'Transport', vendor: t('metroVendor'), icon: '🚇' },
    { name: t('taxiName'), amount: 300, category: 'Transport', vendor: t('taxiVendor'), icon: '🚕' },
    { name: t('groceriesName'), amount: 800, category: 'Groceries', vendor: t('groceriesVendor'), icon: '🛒' },
  ];

  const [input, setInput] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templatesInitialized, setTemplatesInitialized] = useState(false);

  const [aiPreview, setAiPreview] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const [showAddTpl, setShowAddTpl] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplAmount, setTplAmount] = useState('');
  const [tplCategory, setTplCategory] = useState('');
  const [tplVendor, setTplVendor] = useState('');
  const [tplIcon, setTplIcon] = useState('💰');
  const [tplError, setTplError] = useState('');

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      if (res.ok) {
        const text = await res.text();
        if (text) setTransactions(JSON.parse(text));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/templates`);
      if (res.ok) setTemplates(await res.json());
    } catch (err) {
      console.error('Templates fetch error:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const init = async () => {
      const res = await fetch(`${API_URL}/templates`);
      if (!res.ok) return;
      const existing = await res.json();
      if (existing.length === 0) {
        for (const tpl of DEFAULT_TEMPLATES) {
          await fetch(`${API_URL}/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tpl)
          });
        }
      }
      await fetchTemplates();
      setTemplatesInitialized(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const validateInput = (text) => {
    if (!text || !text.trim()) return null;
    const hasAmount = /\d+[.,]?\d*/.test(text);
    const hasVendor = /\p{L}{2,}/u.test(text);
    const hasCategory = /\b(еда|фуд|food|такси|taxi|метро|metro|продукт|grocer|обед|lunch|ужин|dinner|завтрак|breakfast|кафе|cafe|ресторан|restaurant|магазин|shop|одежда|cloth|косметик|cosmetic|аренд|rent|развлеч|entertain|кино|cinema|здоровь|health|лекарств|medic|коммун|utilit|сервис|service|интернет|internet|электрич|electric|подписк|subscription|билет|ticket|транспорт|transport|бензин|gas|fuel|автомобиль|car|ремонт|repair)/i.test(text);

    if (!hasAmount) return t('valMissingAmount');
    if (!hasVendor) return t('valMissingVendor');
    if (!hasCategory) return t('valMissingCategory');
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const validationError = validateInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setWarning('');
    setAiPreview(null);

    try {
      const res = await fetch(`${API_URL}/process-and-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      });

      if (!res.ok) {
        const bodyText = await res.text();
        let detail = t('processError');
        try { detail = JSON.parse(bodyText).detail || detail; } catch {}

        if (detail === 'no_expense_found' || detail.includes('no_expense')) {
          setWarning(t('aiNotFound'));
          setLoading(false);
          return;
        }
        throw new Error(detail);
      }

      setInput('');
      fetchTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0 || !formCategory || !formVendor) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'RUB',
          category: formCategory,
          vendor: formVendor,
          date: formDate
        })
      });

      if (!res.ok) throw new Error(t('saveError'));

      setFormAmount('');
      setFormVendor('');
      setShowForm(false);
      fetchTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = async (id) => {
    try {
      const res = await fetch(`${API_URL}/templates/${id}/use`, { method: 'POST' });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTemplate = async () => {
    const amount = parseFloat(tplAmount);
    if (!tplName || !amount || amount <= 0 || !tplCategory || !tplVendor) {
      setTplError(t('fillAll'));
      return;
    }

    setTplError('');
    const cat = CATEGORIES.find(c => c.value === tplCategory);
    try {
      const res = await fetch(`${API_URL}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tplName,
          amount,
          currency: 'RUB',
          category: tplCategory,
          vendor: tplVendor,
          icon: cat?.emoji || tplIcon
        })
      });

      if (!res.ok) {
        const bodyText = await res.text();
        let detail = t('tplError');
        try { detail = JSON.parse(bodyText).detail || detail; } catch {}
        throw new Error(detail);
      }

      setTplName('');
      setTplAmount('');
      setTplCategory('');
      setTplVendor('');
      setShowAddTpl(false);
      fetchTemplates();
    } catch (err) {
      setTplError(err.message);
    }
  };

  const handleDeleteTemplate = async (id, e) => {
    e.stopPropagation();
    await fetch(`${API_URL}/templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  const handleDelete = async (id) => {
    await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    fetchTransactions();
  };

  const catInfo = (cat) => CATEGORIES.find(c => c.value === cat);

  return (
    <div className="app">
      <header className="header">
        <h1>💰 SpendWise AI</h1>
        <p>{t('subtitle')}</p>
        <button className="lang-toggle" onClick={toggleLang} title={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}>
          {lang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
        </button>
      </header>

      <div className="container">
        <section className="card entry-card">
          <h2>{t('textEntry')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('placeholder')}
                disabled={loading}
              />
              <button type="submit" disabled={loading}>
                {loading ? t('processing') : '📝'}
              </button>
            </div>
          </form>
          {error && <p className="error">{error}</p>}
          {warning && <p className="warning">{warning}</p>}

          {aiPreview && (
            <div className="ai-preview">
              <p className="preview-label">🤖 AI Result:</p>
              <div className="preview-fields">
                {aiPreview.amount && <span className="preview-item"><strong>{t('amount')}:</strong> {aiPreview.amount} {aiPreview.currency}</span>}
                {aiPreview.category && <span className="preview-item"><strong>{t('category')}:</strong> {aiPreview.category}</span>}
                {aiPreview.vendor && <span className="preview-item"><strong>{t('vendor')}:</strong> {aiPreview.vendor}</span>}
                {aiPreview.date && <span className="preview-item"><strong>{t('date')}:</strong> {aiPreview.date}</span>}
              </div>
            </div>
          )}
        </section>

        <section className="card quick-add-card">
          <div className="quick-add-header" onClick={() => setShowForm(!showForm)}>
            <h2>{t('quickAdd')}</h2>
            <span className="toggle-icon">{showForm ? '✕' : '▼'}</span>
          </div>
          {showForm && (
            <div className="quick-form">
              <div className="form-row">
                <div className="form-field">
                  <label>{t('amount')}</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="form-field">
                  <label>{t('vendor')}</label>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    placeholder={t('shopPlaceholder')}
                  />
                </div>
              </div>

              <label>{t('category')}</label>
              <div className="category-grid">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    className={`cat-btn ${formCategory === cat.value ? 'active' : ''}`}
                    onClick={() => setFormCategory(cat.value)}
                    style={{ '--cat-color': cat.color }}
                  >
                    <span className="cat-emoji">{cat.emoji}</span>
                    <span className="cat-label">{cat.value}</span>
                  </button>
                ))}
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>{t('date')}</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="submit-quick-btn"
                onClick={handleQuickAdd}
                disabled={loading || !formAmount || !formCategory || !formVendor}
              >
                {t('addExpense')}
              </button>
            </div>
          )}
        </section>

        {templatesInitialized && (
          <section className="card templates-card">
            <div className="templates-header">
              <h2>{t('templates')}</h2>
              <button className="add-tpl-btn" onClick={() => setShowAddTpl(!showAddTpl)}>
                {showAddTpl ? t('cancel') : t('newTemplate')}
              </button>
            </div>

            {showAddTpl && (
              <div className="add-template-form">
                {tplError && <p className="tpl-error">{tplError}</p>}
                <div className="form-row">
                  <div className="form-field">
                    <label>{t('templateName')}</label>
                    <input
                      type="text"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder={t('lunchName')}
                    />
                  </div>
                  <div className="form-field">
                    <label>{t('templateAmount')}</label>
                    <input
                      type="number"
                      value={tplAmount}
                      onChange={(e) => setTplAmount(e.target.value)}
                      placeholder="350"
                      min="0"
                    />
                  </div>
                </div>
                <div className="form-field" style={{ marginBottom: 12 }}>
                  <label>{t('vendor')}</label>
                  <input
                    type="text"
                    value={tplVendor}
                    onChange={(e) => setTplVendor(e.target.value)}
                    placeholder={t('lunchVendor')}
                  />
                </div>
                <label>{t('category')}</label>
                <div className="category-grid tpl-cats">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      className={`cat-btn ${tplCategory === cat.value ? 'active' : ''}`}
                      onClick={() => {
                        setTplCategory(cat.value);
                        setTplIcon(cat.emoji);
                      }}
                      style={{ '--cat-color': cat.color }}
                    >
                      <span className="cat-emoji">{cat.emoji}</span>
                      <span className="cat-label">{cat.value}</span>
                    </button>
                  ))}
                </div>
                <button
                  className="submit-quick-btn"
                  onClick={handleCreateTemplate}
                >
                  {t('saveTemplate')}
                </button>
              </div>
            )}

            {templates.length > 0 ? (
              <div className="templates-grid">
                {templates.map(tpl => (
                  <div key={tpl.id} className="template-wrapper">
                    <button
                      className="template-btn"
                      onClick={() => useTemplate(tpl.id)}
                    >
                      <span className="tpl-icon">{tpl.icon}</span>
                      <span className="tpl-name">{tpl.name}</span>
                      <span className="tpl-amount">{tpl.amount}₽</span>
                    </button>
                    <button
                      className="tpl-delete"
                      onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                      title={t('deleteTemplate')}
                    >✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">{t('noTemplates')}</p>
            )}
          </section>
        )}

        <section className="card table-card">
          <h2>{t('history')}</h2>
          {transactions.length === 0 ? (
            <p className="empty">{t('noTransactions')}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('thDate')}</th>
                  <th>{t('thCategory')}</th>
                  <th>{t('thVendor')}</th>
                  <th>{t('thAmount')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const ci = catInfo(tx.category);
                  return (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td>
                        <span className="badge" style={{ background: ci ? `${ci.color}20` : '' , color: ci?.color }}>
                          {ci && <span>{ci.emoji} </span>}{tx.category}
                        </span>
                      </td>
                      <td>{tx.vendor}</td>
                      <td className="amount">{tx.amount.toLocaleString()} {tx.currency}</td>
                      <td>
                        <button className="delete-btn" onClick={() => handleDelete(tx.id)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
