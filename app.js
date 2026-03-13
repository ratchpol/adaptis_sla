// Google Sheets configuration
const SHEET_ID = '1m54iTPUCeexfm-OkUdc9n31rmulPArKsDDYDqm5vGYk';
const PRODUCT_SHEET_GID = '1997998778';
const LOCATION_SHEET_GID = '0'; // Adjust this to your location sheet GID
const PRODUCT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${PRODUCT_SHEET_GID}`;
const LOCATION_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${LOCATION_SHEET_GID}`;

let products = [];
let locationSLA = {};

let selectedProducts = new Set();

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadLocationSLA();
    loadProductsFromSheet();
});

// Load location SLA from Google Sheets
async function loadLocationSLA() {
    try {
        const response = await fetch(LOCATION_SHEET_URL);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        const rows = json.table.rows;
        locationSLA = {};
        
        // Skip header row (index 0)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].c;
            if (row && row[0] && row[1]) {
                const location = row[0].v;
                const sla = row[1].v;
                locationSLA[location] = sla;
            }
        }
        
        console.log('Location SLA loaded:', locationSLA);
    } catch (error) {
        console.error('Error loading location SLA:', error);
    }
}

// Load products from Google Sheets
async function loadProductsFromSheet() {
    try {
        const response = await fetch(PRODUCT_SHEET_URL);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        const rows = json.table.rows;
        products = [];
        
        console.log('Total rows:', rows.length);
        
        // Skip header row (index 0)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].c;
            console.log(`Row ${i}:`, row);
            
            // Check if row exists and has at least product ID and name
            if (row) {
                const id = row[0] ? row[0].v : null;
                const name = row[1] ? row[1].v : null;
                
                if (id && name) {
                    products.push({
                        id: id,
                        name: name,
                        channelId: row[2] ? row[2].v : 1,
                        slaBKK: row[3] ? row[3].v : 0,
                        slaUPC: row[4] ? row[4].v : 0
                    });
                } else {
                    console.log(`Skipped row ${i}: id=${id}, name=${name}`);
                }
            }
        }
        
        console.log('Products loaded:', products);
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productList').innerHTML = `
            <div class="alert alert-danger">
                ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ
            </div>
        `;
    }
}

// Render products
function renderProducts() {
    const productList = document.getElementById('productList');
    
    // Sort products by ProductID
    const sortedProducts = [...products].sort((a, b) => a.id - b.id);
    
    productList.innerHTML = sortedProducts.map(product => {
        return `
        <div class="product-card">
            <div class="d-flex align-items-center">
                <input 
                    type="checkbox" 
                    class="product-checkbox" 
                    id="product-${product.id}"
                    value="${product.id}"
                    onchange="toggleProduct(${product.id})"
                >
                <label class="product-label" for="product-${product.id}">
                    ${product.name}
                </label>
                <div class="text-end" style="white-space: nowrap;">
                    <span class="product-sla" style="font-size: 0.75rem; display: inline-block; margin-right: 4px;">
                        <i class="bi bi-clock"></i> BKK: ${product.slaBKK}
                    </span>
                    <span class="product-sla" style="font-size: 0.75rem; display: inline-block;">
                        <i class="bi bi-clock"></i> UPC: ${product.slaUPC}
                    </span>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Toggle product selection
function toggleProduct(productId) {
    if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
    } else {
        selectedProducts.add(productId);
    }
    updateSummary();
}

// Update summary
function updateSummary() {
    const summaryCard = document.getElementById('summaryCard');
    const selectedProductsDiv = document.getElementById('selectedProducts');
    
    if (selectedProducts.size === 0) {
        summaryCard.style.display = 'none';
        return;
    }
    
    summaryCard.style.display = 'block';
    
    // Calculate max SLA and add 4 days
    let maxBKK = 0;
    let maxUPC = 0;
    
    Array.from(selectedProducts).forEach(id => {
        const product = products.find(p => p.id === id);
        maxBKK = Math.max(maxBKK, product.slaBKK);
        maxUPC = Math.max(maxUPC, product.slaUPC);
    });
    
    // Add 4 days to the estimate
    const estimateBKKMin = maxBKK;
    const estimateBKKMax = maxBKK + 4;
    const estimateUPCMin = maxUPC;
    const estimateUPCMax = maxUPC + 4;
    
    // Show only max SLA summary
    const maxSummary = `
        <div class="alert alert-info mb-0" style="border-radius: 12px; border: none; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;">
            <div class="d-flex justify-content-around align-items-center">
                <div class="text-center">
                    <div style="font-size: 0.9rem; opacity: 0.9; font-weight: 600;">SLA Estimate BKK</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">
                        <i class="bi bi-clock-fill"></i> ${estimateBKKMin}~${estimateBKKMax} วัน
                    </div>
                </div>
                <div style="width: 2px; height: 40px; background: rgba(255,255,255,0.3);"></div>
                <div class="text-center">
                    <div style="font-size: 0.9rem; opacity: 0.9; font-weight: 600;">SLA Estimate UPC</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">
                        <i class="bi bi-clock-fill"></i> ${estimateUPCMin}~${estimateUPCMax} วัน
                    </div>
                </div>
            </div>
        </div>
    `;
    
    selectedProductsDiv.innerHTML = maxSummary;
}
