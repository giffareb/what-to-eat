import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const generateBtn = document.getElementById('generateBtn');
    const generateFromIngredientsBtn = document.getElementById('generateFromIngredientsBtn');
    const getRecipeBtn = document.getElementById('getRecipeBtn');
    
    const ingredientsInput = document.getElementById('ingredientsInput');
    const mealTypeEl = document.getElementById('mealType');
    const cuisineTypeEl = document.getElementById('cuisineType');

    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const resultArea = document.getElementById('resultArea');
    const resultCard = document.getElementById('resultCard');
    const recipeCard = document.getElementById('recipeCard');
    const recipeLoader = document.getElementById('recipeLoader');

    const menuNameEl = document.getElementById('menuName');
    const descriptionEl = document.getElementById('description');
    const ingredientsListEl = document.getElementById('ingredientsList');
    const recipeContent = document.getElementById('recipeContent');

    // --- Core API Function ---
    async function callGemini(prompt, schema) {
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        };
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", errorBody);
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.candidates && result.candidates[0]?.content?.parts[0]) {
            return JSON.parse(result.candidates[0].content.parts[0].text);
        } else {
            console.error("Invalid response structure:", result);
            throw new Error("โครงสร้างข้อมูลจาก AI ไม่ถูกต้อง");
        }
    }

    // --- Feature 1: Get menu from ingredients ---
    async function handleGetMenuFromIngredients() {
        const ingredients = ingredientsInput.value.trim();
        if (!ingredients) {
            showError("กรุณาป้อนวัตถุดิบอย่างน้อย 1 อย่างครับ");
            return;
        }
        
        const prompt = `คุณคือเชฟ AI สุดสร้างสรรค์ ช่วยแนะนำเมนูอาหาร 1 อย่างที่ทำได้จากวัตถุดิบเหล่านี้: "${ingredients}". เน้นเมนูที่ทำได้จริงและน่าสนใจ พร้อมคำอธิบายยั่วน้ำลายและหยาบฮาๆ สไตล์เพื่อนสนิท. กรุณาตอบกลับเป็น JSON เท่านั้น`;
        const schema = {
            type: "OBJECT",
            properties: {
                menuName: { type: "STRING" },
                description: { type: "STRING" },
                mainIngredients: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["menuName", "description", "mainIngredients"]
        };

        await executeGeneration(prompt, schema);
    }

    // --- Feature 2: Get menu from preferences ---
    async function handleGetMenuFromPrefs() {
        const mealType = mealTypeEl.value;
        const cuisineType = cuisineTypeEl.value;
        const prompt = `คุณคือเชฟ AI สุดสร้างสรรค์และมีอารมณ์ขัน ช่วยแนะนำเมนูอาหาร 1 อย่าง โดยพิจารณาจากธีมนี้: มื้ออาหาร: "${mealType}", แนวอาหาร: "${cuisineType}".
**ข้อบังคับสำคัญที่สุด:** ไม่ว่าธีมจะเป็นอะไรก็ตาม เมนูที่แนะนำจะต้องเป็นเมนูที่ "ทำง่าย", "ใช้วัตถุดิบพื้นๆ ที่หาซื้อง่ายทั่วไป" และ "คนส่วนใหญ่รู้จัก".
คำอธิบายเมนูต้องยั่วน้ำลายสุดๆ และหยาบฮาๆ สไตล์เพื่อนสนิทคุยกัน.
กรุณาตอบกลับเป็น JSON เท่านั้น`;
          const schema = {
            type: "OBJECT",
            properties: {
                menuName: { type: "STRING" },
                description: { type: "STRING" },
                mainIngredients: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["menuName", "description", "mainIngredients"]
        };
        
        await executeGeneration(prompt, schema);
    }
    
    // --- Shared generation logic ---
    async function executeGeneration(prompt, schema) {
        setLoadingState(true);
        try {
            const foodData = await callGemini(prompt, schema);
            displayResult(foodData);
        } catch (error) {
            console.error("Error generating menu:", error);
            showError(error.message || "AI เหมือนจะสมองเบลอๆ ลองใหม่อีกทีนะ!");
        } finally {
            setLoadingState(false);
        }
    }

    // --- Feature 3: Get Recipe ---
    async function handleGetRecipe() {
        const menuName = menuNameEl.textContent;
        if (!menuName) return;

        const description = descriptionEl.textContent;
        const mainIngredients = Array.from(ingredientsListEl.querySelectorAll('li')).map(li => li.textContent).join(', ');

        recipeLoader.classList.remove('hidden');
        recipeCard.classList.remove('hidden');
        recipeContent.innerHTML = '';
        getRecipeBtn.disabled = true;
        getRecipeBtn.classList.add('opacity-70');

        try {
            const prompt = `คุณคือเชฟผู้ใจดีและละเอียดรอบคอบ ช่วยบอกสูตรและวิธีทำสำหรับเมนูที่มีรายละเอียดดังนี้:
- ชื่อเมนู: "${menuName}"
- คำอธิบายเมนู: "${description}"
- วัตถุดิบหลักที่เกี่ยวข้อง: "${mainIngredients}"
กรุณายึดข้อมูลข้างต้นเป็นหลักในการสร้างสูตรสำหรับ 1-2 ที่ โดยต้องระบุ "รายการวัตถุดิบพร้อมปริมาณที่ชัดเจน" และ "ขั้นตอนการทำ" แบบง่ายๆ สำหรับมือใหม่. กรุณาตอบกลับเป็น JSON ที่ถูกต้องตาม schema เท่านั้น`;
            
            const schema = {
                type: "OBJECT",
                properties: {
                    ingredientsWithAmount: {
                        type: "ARRAY",
                        description: "รายการวัตถุดิบพร้อมปริมาณที่ชัดเจน",
                        items: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING", description: "ชื่อวัตถุดิบ" },
                                amount: { type: "STRING", description: "ปริมาณ (เช่น 200 กรัม, 1 ช้อนโต๊ะ)" }
                            },
                            required: ["name", "amount"]
                        }
                    },
                    steps: { 
                        type: "ARRAY", 
                        items: { type: "STRING" },
                        description: "ขั้นตอนการทำอาหาร แบ่งเป็นข้อๆ"
                    },
                    tip: { 
                        type: "STRING", 
                        description: "เคล็ดลับเล็กๆ น้อยๆ หรือข้อแนะนำเพิ่มเติม (ถ้ามี)"
                    }
                },
                required: ["ingredientsWithAmount", "steps"]
            };
            
            const recipeData = await callGemini(prompt, schema);
            displayRecipe(recipeData, menuName);

        } catch(error) {
            console.error("Error fetching recipe:", error);
            recipeContent.innerHTML = `<p class="text-red-600">ขออภัย AI ไม่สามารถสร้างสูตรอาหารได้ในขณะนี้</p>`;
        } finally {
            recipeLoader.classList.add('hidden');
            getRecipeBtn.disabled = false;
            getRecipeBtn.classList.remove('opacity-70');
        }
    }

    // --- UI Update Functions ---
    function setLoadingState(isLoading) {
        if (isLoading) {
            loader.classList.remove('hidden');
            errorMessage.classList.add('hidden');
            resultArea.classList.add('hidden');
            generateBtn.disabled = true;
            generateFromIngredientsBtn.disabled = true;
        } else {
            loader.classList.add('hidden');
            generateBtn.disabled = false;
            generateFromIngredientsBtn.disabled = false;
        }
    }

    function displayResult(data) {
        menuNameEl.textContent = data.menuName;
        descriptionEl.textContent = data.description;
        ingredientsListEl.innerHTML = '';
        data.mainIngredients.forEach(ing => {
            const li = document.createElement('li');
            li.textContent = ing;
            ingredientsListEl.appendChild(li);
        });

        resultArea.classList.remove('hidden');
        resultCard.classList.remove('hidden');
        recipeCard.classList.add('hidden');
        recipeContent.innerHTML = '';
        getRecipeBtn.classList.remove('hidden');
    }

    function displayRecipe(data, menuName) {
        let html = `<h3 class="text-xl font-bold text-green-800 mb-4">สูตรและวิธีทำ "${menuName}"</h3>`;
        
        if (data.ingredientsWithAmount && data.ingredientsWithAmount.length > 0) {
            html += '<h4 class="font-semibold text-green-900 mb-2">📋 วัตถุดิบ (สำหรับ 1-2 ที่)</h4>';
            html += '<ul class="list-none space-y-1 text-green-900 mb-4 pl-2">';
            data.ingredientsWithAmount.forEach(item => {
                html += `<li><span class="font-semibold">${item.name}:</span> ${item.amount}</li>`;
            });
            html += '</ul>';
        }

        html += '<h4 class="font-semibold text-green-900 mb-2">🍳 ขั้นตอนการทำ</h4>';
        html += '<ol class="list-decimal list-inside space-y-2 text-green-900">';
        data.steps.forEach(step => {
            html += `<li>${step}</li>`;
        });
        html += '</ol>';

        if (data.tip) {
            html += `<div class="mt-4 pt-3 border-t border-green-200">
                           <p class="font-semibold text-green-800">💡 เคล็ดลับ:</p>
                           <p class="text-green-700">${data.tip}</p>
                         </div>`;
        }
        recipeContent.innerHTML = html;
    }

    function showError(message) {
        errorMessage.innerHTML = `<strong class="font-bold">อุ๊ย!</strong> <span class="block sm:inline">${message}</span>`;
        errorMessage.classList.remove('hidden');
        setTimeout(() => errorMessage.classList.remove('opacity-0'), 10);
    }

    // --- Event Listeners ---
    generateBtn.addEventListener('click', handleGetMenuFromPrefs);
    generateFromIngredientsBtn.addEventListener('click', handleGetMenuFromIngredients);
    getRecipeBtn.addEventListener('click', handleGetRecipe);
});