/*
 *  Majiang.Player
 */
"use strict";

const Majiang = {
    Shoupai: require('../shoupai'),
    Game:    require('../game'),
    Util:    require('../util'),
    SuanPai: require('../suanpai'),
};

const width = [12, 12*6, 12*6*3];

function add_hongpai(tingpai) {
    let new_tingpai = [];
    for (let p of tingpai) {
        if (p[0] != 'z' && p[1] == '5') new_tingpai.push(p.replace(/5/,'0'));
        new_tingpai.push(p);
    }
    return new_tingpai;
}

module.exports = class Player {

constructor(id) { this._id = id }

action(msg, callback) {

    this._callback = callback;

    if      (msg.kaiju)    this.kaiju  (msg.kaiju);
    else if (msg.qipai)    this.qipai  (msg.qipai);
    else if (msg.zimo)     this.zimo   (msg.zimo);
    else if (msg.dapai)    this.dapai  (msg.dapai);
    else if (msg.fulou)    this.fulou  (msg.fulou);
    else if (msg.gang)     this.gang   (msg.gang);
    else if (msg.gangzimo) this.zimo   (msg.gangzimo, 'lingshang')
    else if (msg.kaigang)  this.kaigang(msg.kaigang);
    else if (msg.hule)     this.hule   (msg.hule);
    else if (msg.pingju)   this.pingju (msg.pingju);
    else if (msg.jieju)    this.hule   (msg.jieju);
}

kaiju(kaiju) {
    this._model = {
        player:  kaiju.player,
        qijia:   kaiju.qijia
    };
    this._hongpai = kaiju.hongpai;
}

qipai(qipai) {

    let model = this._model;

    model.zhuangfeng = qipai.zhuangfeng;
    model.menfeng    = (8 + this._id - model.qijia - qipai.jushu) % 4;
    model.changbang  = qipai.changbang;
    model.lizhibang  = qipai.lizhibang;
    model.defen      = qipai.defen;

    this._shoupai   = Majiang.Shoupai.fromString(qipai.shoupai[model.menfeng]);
    this._he        = {};
    this._paishu    = 136 - 13 * 4 - 14;
    this._baopai    = [ qipai.baopai ];

    this._neng_rong = true;
    this._diyizimo  = true;

    this._suanpai = new Majiang.SuanPai(this._hongpai);
    this._suanpai.qipai(qipai, model.menfeng);

    this._defen_cache = {};
    this._eval_cache  = {};
}

zimo(zimo, option) {

    let model = this._model;

    this._suanpai.zimo(zimo);

    this._paishu--;

    if (zimo.l != model.menfeng) { this._callback(); return }

    this._shoupai.zimo(zimo.p);

    this._eval_cache = {};
    this.action_zimo(zimo, option);

    this._diyizimo = false;
}

dapai(dapai) {

    let model = this._model;

    this._suanpai.dapai(dapai);

    if (dapai.l == model.menfeng) {

        if (! this._shoupai.lizhi()) this._neng_rong = true;

        this._shoupai.dapai(dapai.p);

        this._he[dapai.p.substr(0,2).replace(/0/,'5')] = true;

        if (Majiang.Util.xiangting(this._shoupai) == 0
            && Majiang.Util.tingpai(this._shoupai).find(p=>this._he[p]))
        {
            this._neng_rong = false;
        }

        this._callback();
    }
    else {
        this.action_dapai(dapai);

        let shoupai = this._shoupai.clone().zimo(dapai.p);
        if (Majiang.Util.xiangting(shoupai) == -1) this._neng_rong = false;
    }

    if (dapai.p.substr(-1) == '*') {
        model.lizhibang++;
    }
}

fulou(fulou) {

    let model = this._model;

    this._suanpai.fulou(fulou);

    this._diyizimo = false;

    if (fulou.l != model.menfeng) { this._callback(); return }

    this._shoupai.fulou(fulou.m);

    if (fulou.m.match(/^[mpsz]\d{4}/)) { this._callback(); return }

    this.action_fulou(fulou);
}

gang(gang) {

    let model = this._model;

    this._suanpai.gang(gang);

    this._diyizimo = false;

    if (gang.l == model.menfeng) {

        let p = (gang.m.match(/^[mpsz]\d{4}$/))
                    ? gang.m.replace(/0/,'5').substr(0,2)
                    : gang.m[0] + gang.m.substr(-1)
        this._shoupai.gang(p);

        this._callback();
        return;
    }

    if (! gang.m.match(/^[mpsz]\d{4}/)) {

        this.action_gang(gang);

        let shoupai = this._shoupai.clone().zimo(gang.m.substr(0,2));
        if(Majiang.Util.xiangting(shoupai) == -1) this._neng_rong = false;
    }
    else this._callback();
}

kaigang(kaigang) {
    this._suanpai.kaigang(kaigang);
    this._baopai.push(kaigang.baopai);
    this._defen_cache = {};
}

hule(hule)     { this.wait(); }

pingju(pingju) { this.wait(); }

jieju(jieju)   { this.wait(); }

wait() { this._callback() }

action_zimo(zimo, option) {
    let mianzi;
    if      (this.select_hule(null, option)) this._callback({hule: '-'});
    else if (this.select_pingju())           this._callback({pingju: '-'});
    else if (mianzi = this.select_gang())    this._callback({gang: mianzi});
    else this._callback({dapai: this.select_dapai()});
}

action_dapai(dapai) {
    let mianzi;
    if      (this.select_hule(dapai))           this._callback({hule: '-'});
    else if (mianzi = this.select_fulou(dapai)) this._callback({fulou: mianzi});
    else                                        this._callback();
}

action_fulou(fulou) {
    this._callback({dapai: this.select_dapai()});
}

action_gang(gang) {
    if (this.select_hule(gang, 'qianggang')) this._callback({hule: '-'});
    else                                     this._callback();
}

get_dapai() {
    return  Majiang.Game.get_dapai(this._shoupai);
}

get_chi_mianzi(dapai) {
    let model = this._model;
    let p = dapai.p
          + ['','+','=','-'][(4 + dapai.l - model.menfeng) % 4];
    return Majiang.Game.get_chi_mianzi(this._shoupai, p, this._paishu);
}

get_peng_mianzi(dapai) {
    let model = this._model;
    let p = dapai.p
          + ['','+','=','-'][(4 + dapai.l - model.menfeng) % 4];
    return Majiang.Game.get_peng_mianzi(this._shoupai, p, this._paishu);
}

get_gang_mianzi(dapai) {
    let model = this._model;
    if (dapai) {
        let p = dapai.p
              + ['','+','=','-'][(4 + dapai.l - model.menfeng) % 4];
        return Majiang.Game.get_gang_mianzi(this._shoupai, p, this._paishu);
    }
    else {
        return Majiang.Game.get_gang_mianzi(this._shoupai, null, this._paishu);
    }
}

allow_lizhi(p) {
    let model = this._model;
    return Majiang.Game.allow_lizhi(this._shoupai, p, this._paishu,
                                    model.defen[model.menfeng]);
}

allow_hule(data, option) {

    let model = this._model;

    let hupai = this._shoupai.lizhi()
                || option != null
                || this._paishu == 0;
    if (data) {
        let p = (data.p ? data.p.substr(0,2) : data.m[0] + data.m.substr(-1))
              + ['','+','=','-'][(4 + data.l - model.menfeng) % 4];
        return Majiang.Game.allow_hule(this._shoupai, p,
                                        model.zhuangfeng, model.menfeng,
                                        hupai, this._neng_rong);
    }
    else {
        return Majiang.Game.allow_hule(this._shoupai, null,
                                        model.zhuangfeng, model.menfeng,
                                        hupai);
    }
}

allow_pingju() {
    return Majiang.Game.allow_pingju(this._shoupai, this._diyizimo);
}

select_fulou(dapai) {

    let n_xiangting = Majiang.Util.xiangting(this._shoupai);

    if (this._suanpai._lizhi.find(l=>l) && n_xiangting > 1) return;

    if (n_xiangting < 3) {

        let mianzi = this.get_gang_mianzi(dapai)
                        .concat(this.get_peng_mianzi(dapai))
                        .concat(this.get_chi_mianzi(dapai));
        if (! mianzi.length) return;

        let fulou;
        let paishu = this._suanpai.paishu_all();
        let max    = this.eval_shoupai(this._shoupai, paishu);
        for (let m of mianzi) {
            let shoupai = this._shoupai.clone().fulou(m);
            if (Majiang.Util.xiangting(shoupai) >= 3) continue;

            let ev = this.eval_shoupai(shoupai, paishu);

            if (ev > max) {
                max = ev;
                fulou = m;
            }
        }
        return fulou;
    }
    else {

        n_xiangting = this.xiangting(this._shoupai);

        for (let m of this.get_peng_mianzi(dapai)
                            .concat(this.get_chi_mianzi(dapai)))
        {
            let shoupai = this._shoupai.clone().fulou(m);
            if (this.xiangting(shoupai) < n_xiangting) return m;
        }
    }
}

select_gang() {

    let n_xiangting = Majiang.Util.xiangting(this._shoupai);

    if (this._suanpai._lizhi.find(l=>l) && n_xiangting > 0) return;

    if (n_xiangting < 3) {

        let paishu = this._suanpai.paishu_all();
        let ev = this.eval_shoupai(this._shoupai, paishu);
        for (let m of this.get_gang_mianzi()) {
            let p = m.match(/^[mpsz]\d{4}$/)
                        ? m.replace(/0/,'5').substr(0,2)
                        : m[0] + m.substr(-1);
            let shoupai = this._shoupai.clone().gang(p);
            if (Majiang.Util.xiangting(shoupai) >= 3) continue;

            if (this.eval_shoupai(shoupai, paishu) > ev) return m;
        }
    }
    else {

        let n_xiangting = this.xiangting(this._shoupai);

        for (let m of this.get_gang_mianzi()) {
            let p = m.match(/^[mpsz]\d{4}$/)
                        ? m.replace(/0/,'5').substr(0,2)
                        : m[0] + m.substr(-1);
            let shoupai = this._shoupai.clone().gang(p);
            if (this.xiangting(shoupai) == n_xiangting) return m;
        }
    }
}

select_dapai() {

    const suan_weixian = (p) => {
        let weixian = 0;
        for (let l = 0; l < 4; l++) {
            if (! this._suanpai._lizhi[l]) continue;
            let w = this._suanpai.suan_weixian(p, l);
            if (w > weixian) weixian = w;
        }
        return weixian;
    }

    let anquan, min = Infinity;
    if (this._suanpai._lizhi.find(l=>l)) {
        for (let p of this.get_dapai()) {
            let weixian = suan_weixian(p);
            if (weixian < min) {
                min = weixian;
                anquan = p;
            }
        }
    }

    let dapai, max = 0, max_tingpai = 0, backtrack = [];
    let paishu = this._suanpai.paishu_all();;
    let n_xiangting = Majiang.Util.xiangting(this._shoupai);
    for (let p of this.get_dapai()) {
        if (! dapai) dapai = p;
        let shoupai = this._shoupai.clone().dapai(p);
        if (Majiang.Util.xiangting(shoupai) > n_xiangting) {
            if (n_xiangting < 2) backtrack.push(p);
            continue;
        }

        let x = 1 - this._suanpai.paijia(p)/100
              + this.eval_shoupai(shoupai, paishu);

        let n_tingpai = 0;
        for (let tp of Majiang.Util.tingpai(shoupai)) {
            n_tingpai += paishu[tp];
        }

        if (x >= max) {
            max = x;
            dapai = p;
            max_tingpai = n_tingpai;
        }
    }
    let tmp_max = max;

    for (let p of backtrack) {
        let shoupai = this._shoupai.clone().dapai(p);

        let n_tingpai = 0;
        for (let tp of Majiang.Util.tingpai(shoupai)) {
            n_tingpai += paishu[tp];
        }
        if (n_tingpai < max_tingpai * 6) continue;

        let x = 1 - this._suanpai.paijia(p)/100
              + this.eval_backtrack(shoupai, paishu, tmp_max, p);

        if (x >= max) {
            max = x;
            dapai = p;
        }
    }

    if (anquan) {
        if      (n_xiangting > 1)                             dapai = anquan;
        else if (n_xiangting == 1 && suan_weixian(dapai) > 5) dapai = anquan;
    }

    if (this.select_lizhi(dapai)) dapai += '*';
    return dapai;
}

select_lizhi(p) {
    return this.allow_lizhi(p);
}

select_hule(data, option) {
    return this.allow_hule(data, option);
}

select_pingju() {
    if (Majiang.Util.xiangting(this._shoupai) < 4) return false;
    return this.allow_pingju();
}

xiangting(shoupai) {

    function xiangting_menqian(shoupai) {
        return shoupai.menqian() ? Majiang.Util.xiangting(shoupai) : Infinity;
    };
    function xiangting_fanpai(shoupai, zhuangfeng, menfeng, suanpai) {
        let n_fanpai = 0, back;
        for (let n of [zhuangfeng+1, menfeng+1, 5, 6, 7]) {
            if (shoupai._bingpai.z[n] >= 3) n_fanpai++;
            else if (shoupai._bingpai.z[n] == 2
                     && suanpai.paishu('z'+n)) back = n;
            for (let m of shoupai._fulou) {
                if (m[0] == 'z' && m[1] == n) n_fanpai++;
            }
        }
        if (n_fanpai) return Majiang.Util.xiangting(shoupai);
        if (back) {
            let new_shoupai = shoupai.clone();
            new_shoupai._bingpai.z[back] = 3;
            return Majiang.Util.xiangting(new_shoupai) + 1;
        }
        return Infinity;
    }
    function xiangting_duanyao(shoupai) {
        if (shoupai._fulou.find(m=>m.match(/^z|[19]/))) return Infinity;
        let new_shoupai = shoupai.clone();
        for (let s of ['m','p','s']) {
            for (let n of [1,9]) {
                new_shoupai._bingpai[s][n] = 0;
            }
        }
        new_shoupai._bingpai.z = [0,0,0,0,0,0,0,0];
        return Majiang.Util.xiangting(new_shoupai);
    }
    function xiangting_duidui(shoupai) {
        if (shoupai._fulou.map(m=>m.replace(/0/,'5'))
                        .find(m=>! m.match(/^[mpsz](\d)\1\1/))) return Infinity;
        let n_kezi = shoupai._fulou.length, n_duizi = 0;
        for (let s of ['m','p','s','z']) {
            let bingpai = shoupai._bingpai[s];
            for (let n = 1; n < bingpai.length; n++) {
                if      (bingpai[n] >= 3) n_kezi++;
                else if (bingpai[n] == 2) n_duizi++;
            }
        }
        if (n_kezi + n_duizi > 5) n_duizi = 5 - n_kezi;
        return 8 - n_kezi * 2 - n_duizi;
    }
    function xiangting_yise(shoupai, suit) {
        const regexp = new RegExp(`^[^z${suit}]`);
        if (shoupai._fulou.find(m=>m.match(regexp))) return Infinity;
        let new_shoupai = shoupai.clone();
        for (let s of ['m','p','s']) {
            if (s != suit) new_shoupai._bingpai[s] = [0,0,0,0,0,0,0,0,0,0];
        }
        return Majiang.Util.xiangting(new_shoupai);
    }

    return Math.min(
        xiangting_menqian(shoupai),
        xiangting_fanpai(shoupai, this._model.zhuangfeng, this._model.menfeng,
                         this._suanpai),
        xiangting_duanyao(shoupai),
        xiangting_duidui(shoupai),
        xiangting_yise(shoupai, 'm'),
        xiangting_yise(shoupai, 'p'),
        xiangting_yise(shoupai, 's')
    );
}

tingpai(shoupai) {

    let n_xiangting = this.xiangting(shoupai);

    let pai = [];
    for (let p of Majiang.Util.tingpai(shoupai, s=>this.xiangting(s))) {

        if (n_xiangting > 0) {

            for (let m of shoupai.get_peng_mianzi(p+'+')) {
                let new_shoupai = shoupai.clone().fulou(m);
                if (this.xiangting(new_shoupai) < n_xiangting) {
                    pai.push(p+'+');
                    break;
                }
            }
            if (pai[pai.length - 1] == p+'+') continue;

            for (let m of shoupai.get_chi_mianzi(p+'-')) {
                let new_shoupai = shoupai.clone().fulou(m);
                if (this.xiangting(new_shoupai) < n_xiangting) {
                    pai.push(p+'-');
                    break;
                }
            }
            if (pai[pai.length - 1] == p+'-') continue;
        }
        pai.push(p);
    }
    return pai;
}

get_defen(shoupai) {

    let paistr = shoupai.toString();
    if (this._defen_cache[paistr] != null) return this._defen_cache[paistr];

    let param = {
        zhuangfeng: this._model.zhuangfeng,
        menfeng:    this._model.menfeng,
        hupai:      { lizhi: shoupai.menqian() },
        baopai:     this._baopai,
        jicun:      { changbang: 0, lizhibang: 0 }
    };
    let hule = Majiang.Util.hule(shoupai, null, param);

    this._defen_cache[paistr] = hule.defen;
    return hule.defen;
}

eval_shoupai(shoupai, paishu, dapai) {

    let paistr = shoupai.toString();
    if (this._eval_cache[paistr] != null) return this._eval_cache[paistr];

    let rv;
    let n_xiangting = Majiang.Util.xiangting(shoupai);

    if (n_xiangting == -1) {
        rv = this.get_defen(shoupai);
    }
    else if (shoupai._zimo) {
        let max = 0;
        for (let p of shoupai.get_dapai()) {
            let new_shoupai = shoupai.clone().dapai(p);
            if (Majiang.Util.xiangting(new_shoupai) > n_xiangting) continue;
            let r = this.eval_shoupai(new_shoupai, paishu, dapai);
            if (r > max) max = r;
        }
        rv = max;
    }
    else if (n_xiangting < 3) {
        let r = 0;
        for (let p of add_hongpai(Majiang.Util.tingpai(shoupai))) {
            if (p == dapai)  return 0;
            if (! paishu[p]) continue;
            let new_shoupai = shoupai.clone().zimo(p);
            paishu[p]--;
            let ev = this.eval_shoupai(new_shoupai, paishu, dapai);
            if (! dapai) {
                if (n_xiangting > 1)
                    ev += this.eval_fulou(shoupai, p, paishu,
                                          (s)=>this.xiangting(s));
                else if (n_xiangting > 0)
                    ev += this.eval_fulou(shoupai, p, paishu);
            }
            paishu[p]++;
            r += ev * paishu[p];
        }
        rv = r / width[n_xiangting];
    }
    else {
        let r = 0;
        for (let p of add_hongpai(this.tingpai(shoupai))) {
            r += this._suanpai.paishu(p) * (  p[2] == '+' ? 4
                                            : p[2] == '-' ? 2 : 1 );
        }
        rv = r;
    }

    this._eval_cache[paistr] = rv;
    return rv;
}

eval_backtrack(shoupai, paishu, min, dapai) {

    let n_xiangting = Majiang.Util.xiangting(shoupai);

    let r = 0;
    for (var p of add_hongpai(Majiang.Util.tingpai(shoupai))) {
        if (p == dapai)  continue;
        if (! paishu[p]) continue;

        let new_shoupai = shoupai.clone().zimo(p);

        paishu[p]--;
        let ev = this.eval_shoupai(new_shoupai, paishu, dapai);
        paishu[p]++;

        if (ev < min * 2) continue;

        r += ev * paishu[p];
    }
    return r / width[n_xiangting];
}

eval_fulou(shoupai, p, paishu, xiangting = Majiang.Util.xiangting) {

    let n_xiangting = xiangting(shoupai);

    let peng_max = 0;
    for (let m of shoupai.get_peng_mianzi(p+'+')) {
        let new_shoupai = shoupai.clone().fulou(m);
        if (xiangting(new_shoupai) >= n_xiangting) continue;
        peng_max = Math.max(this.eval_shoupai(new_shoupai, paishu), peng_max);
    }

    let chi_max = 0;
    for (let m of shoupai.get_chi_mianzi(p+'-')) {
        let new_shoupai = shoupai.clone().fulou(m);
        if (xiangting(new_shoupai) >= n_xiangting) continue;
        chi_max = Math.max(this.eval_shoupai(new_shoupai, paishu), chi_max);
    }

    return (peng_max > chi_max) ? peng_max * 3 : peng_max * 2 + chi_max;
}

}
