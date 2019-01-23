const Base = require('./base.js');

module.exports = class extends Base {

  async finduserbarginAction() {
    const bargainid = this.post('bargainid');
    return this.success({
      bargainmain_table_info: 
      {
        is_abled: 1,
        purchased_num:5
      },
      bargainuser_table_info: {
        bargain_id:"1",
        goods_pic:"1",
        goods_name:"1",
        goods_rel_price:"1",
        goods_lowest_price:"1",
        have_cut_price:"1",
        have_cut_lest:"1",
        listtime:"1",
      },
      launched_userInfo: {
        avatar:"1",
        nickname:"hh"
      },
      goods: {
        id: 11
      },
      othergoods: []
    });
  }

  async setlaunchuserbarAction() {
    /**
     *  data: {
    bargain_user_table_id: 0, //bargain_user表的id
    launched_userInfo: {}, //发起用户的数据
    bargainUserInfo: {}, //bargain_info表的数据
    bargainMainInfo: {}, //bargain 主表的数据
    goodsInfo: {}, //砍价的商品的数据
    otherGoods: [], //猜你喜欢的商品
    cuted_user_list: [], //参与砍价的人
    bar_is_End: false, //拼团超时
    auth: false, //用户是否授权
    user_IN_Info: {}, //进入页面的用户信息
    is_launch_user: false, //进入用户是否为发起者
    share_btn_disabled: true, //按钮失效状态
    showShareModalStatus: false, //分享弹窗的状态
    animationShareData: {}, //分享按钮的动画
    showFCPrice: false, //好友砍价完之后显示砍价金额的弹层
    userIsCut: 1, //进入用户是否参与过此次砍价 （默认为参与过）
    FCcutprice: 0.0, //用户砍了的价格 (回显)
    IS_CUT_SUCCESS: false, //砍价是否完成
    IS_CUT_SUCCESS_AND_GET: false, //砍价是否生成了订单
    showAdressModalStatus: false, //收货地址的弹层状态
    animationAdressData: {}, //收货地址的弹层动画
    addressList: [], //用户的收货地址
    rotateanimation: {}
  },
     */
    const goodsId = this.post('goodsId');
    const productId = this.post('productId');
    const number = 1;

    // 判断商品是否可以购买
    const goodsInfo = await this.model('goods').where({id: goodsId}).find();
    if (think.isEmpty(goodsInfo) || goodsInfo.is_delete === 1) {
      return this.fail(400, '商品已下架');
    }

    // 取得规格的信息,判断规格库存
    const productInfo = await this.model('product').where({goods_id: goodsId, id: productId}).find();
    if (think.isEmpty(productInfo) || productInfo.goods_number < number) {
      return this.fail(400, '库存不足');
    }

    // 判断bargin中是否存在此规格商品
    const cartInfo = await this.model('bargincart').where({goods_id: goodsId, product_id: productId}).find();
    if (think.isEmpty(cartInfo)) {
      // 添加操作

      // 添加规格名和值
      let goodsSepcifitionValue = [];
      if (!think.isEmpty(productInfo.goods_specification_ids)) {
        goodsSepcifitionValue = await this.model('goods_specification').where({
          goods_id: goodsId,
          id: {'in': productInfo.goods_specification_ids.split('_')}
        }).getField('value');
      }

      // 添加到购物车
      const cartData = {
        goods_id: goodsId,
        product_id: productId,
        goods_sn: productInfo.goods_sn,
        goods_name: goodsInfo.name,
        list_pic_url: goodsInfo.list_pic_url,
        number: number,
        session_id: 1,
        user_id: this.getLoginUserId(),
        retail_price: productInfo.retail_price,
        market_price: productInfo.retail_price,
        goods_specifition_name_value: goodsSepcifitionValue.join(';'),
        goods_specifition_ids: productInfo.goods_specification_ids,
        checked: 1
      };

      await this.model('cart').thenAdd(cartData, {product_id: productId});
    } else {
      // 如果已经存在bargin中，则判断是否失效
      return this.fail(400, '已拼');
    }
    return this.success(await this.getCart());
  }
  /**
   * 获取用户的收货地址
   * @return {Promise} []
   */
  async listAction() {
    const addressList = await this.model('address').where({user_id: this.getLoginUserId()}).select();
    let itemKey = 0;
    for (const addressItem of addressList) {
      addressList[itemKey].province_name = await this.model('region').getRegionName(addressItem.province_id);
      addressList[itemKey].city_name = await this.model('region').getRegionName(addressItem.city_id);
      addressList[itemKey].district_name = await this.model('region').getRegionName(addressItem.district_id);
      addressList[itemKey].full_region = addressList[itemKey].province_name + addressList[itemKey].city_name + addressList[itemKey].district_name;
      itemKey += 1;
    }

    return this.success(addressList);
  }

  /**
   * 获取收货地址的详情
   * @return {Promise} []
   */
  async detailAction() {
    const addressId = this.get('id');

    const addressInfo = await this.model('address').where({user_id: this.getLoginUserId(), id: addressId}).find();
    if (!think.isEmpty(addressInfo)) {
      addressInfo.province_name = await this.model('region').getRegionName(addressInfo.province_id);
      addressInfo.city_name = await this.model('region').getRegionName(addressInfo.city_id);
      addressInfo.district_name = await this.model('region').getRegionName(addressInfo.district_id);
      addressInfo.full_region = addressInfo.province_name + addressInfo.city_name + addressInfo.district_name;
    }

    return this.success(addressInfo);
  }

  /**
   * 添加或更新收货地址
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async saveAction() {
    let addressId = this.post('id');

    const addressData = {
      name: this.post('name'),
      mobile: this.post('mobile'),
      province_id: this.post('province_id'),
      city_id: this.post('city_id'),
      district_id: this.post('district_id'),
      address: this.post('address'),
      user_id: this.getLoginUserId(),
      is_default: this.post('is_default') === true ? 1 : 0
    };

    if (think.isEmpty(addressId)) {
      addressId = await this.model('address').add(addressData);
    } else {
      await this.model('address').where({id: addressId, user_id: this.getLoginUserId()}).update(addressData);
    }

    // 如果设置为默认，则取消其它的默认
    if (this.post('is_default') === true) {
      await this.model('address').where({id: ['<>', addressId], user_id: this.getLoginUserId()}).update({
        is_default: 0
      });
    }
    const addressInfo = await this.model('address').where({id: addressId}).find();

    return this.success(addressInfo);
  }

  /**
   * 删除指定的收货地址
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async deleteAction() {
    const addressId = this.post('id');

    await this.model('address').where({id: addressId, user_id: this.getLoginUserId()}).delete();

    return this.success('删除成功');
  }
};
