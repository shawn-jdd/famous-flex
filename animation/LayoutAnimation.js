import EngineAnimation from '../engine/Animation';
import Animation from './Animation';
import {assert, cloneArray} from '../utils';
import AnimationPromise from './AnimationPromise';

let animationsPool = [];

class Item {
  constructor(object) {
    this.object = object;
    this.properties = {};
    this.initiallyVisible = !!object.getParent();
  }
  preLayout() {
    for (let key in this.properties) {
      const prop = this.properties[key];
      prop.active = true;
    }
  }
  postLayout() {
    for (let key in this.properties) {
      const prop = this.properties[key];
      prop.active = false;
      if ((prop.layoutValue === undefined) && this.object.identity) {
        prop.layoutValue = this.object.identity[key];
      }
      if (prop.layoutValue !== undefined) {
        if (this._initiallyVisible && !this.object.getParent()) {
          prop.startValue = prop.layoutValue;
          prop.endValue = prop.value;
        } else {
          prop.startValue = prop.value;
          prop.endValue = prop.layoutValue;
        }
      }
    }
    this.update(this.progress);
  }
  update(progress) {
    this.progress = progress;
    for (let key in this.properties) {
      const prop = this.properties[key];
      if (prop.startValue !== undefined) {
        if (Array.isArray(prop.startValue)) {
          for (var k = 0; k < prop.endValue.length; k++) {
            const endValue = prop.endValue[k];
            const startValue = prop.startValue[k];
            if (Array.isArray(endValue)) {
              for (var n = 0; n < endValue.length; n++) {
                prop.curValue[k][n] = ((endValue[n] - startValue[n]) * progress) + startValue[n];
              }
            } else {
              prop.curValue[k] = ((endValue - startValue) * progress) + startValue;
            }
          }
          this.object[key] = prop.curValue;
        } else {
          this.object[key] = ((prop.endValue - prop.startValue) * progress) + prop.startValue;
        }
      }
    }
  }
}

class ItemProperty {
  constructor(property) {
    this.property = property;
  }
  collect(object, property, newValue, curValue) {
    this.layoutValue = Array.isArray(newValue) ? cloneArray(newValue) : newValue;
  }
}

const State = {
  INIT: 0,
  PRELAYOUT: 1,
  POSTLAYOUT: 2
};

export default class LayoutAnimation extends EngineAnimation {

  onUpdate(value) {
    for (var j = 0; j < this.items.length; j++) {
      const item = this.items[j];
      item.update(value);
    }
  }

  collect(object, property, newValue, curValue) {
    const items = this.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.object === object) {
        if (!item.properties[property]) {
          item.properties[property] = new ItemProperty(property);
        }
        item.properties[property].value = Array.isArray(newValue) ? cloneArray(newValue) : newValue; // allocate array for re-use
        return item.properties[property];
      }
    }
    const item = new Item(object);
    items.push(item);
    item.properties[property] = new ItemProperty(property);
    item.properties[property].value = Array.isArray(newValue) ? cloneArray(newValue) : newValue; // allocate array for re-use
    if (!object.getParent()) {
      Animation.animation = undefined;
      object[property] = newValue;
      Animation.animation = this;
    }
    object.__animCollectors = object.__animCollectors || {};
    object.__animCollectors[property] = item.properties[property];
    return true;
  }

  stop(cancelled) {
    super.stop();
    if (!cancelled) {
      for (var j = 0; j < this.items.length; j++) {
        this.items[j].update(1);
      }
    }
    this.items = undefined;
    animationsPool.push(this);
  }

  get state() {
    return this._state;
  }

  set state(value) {
    if (this._state !== value) {
      this._state = value;
      switch (this._state) {
        case State.PRELAYOUT:
          for (let i = 0; i < this.items.length; i++) this.items[i].preLayout();
          break;
        case State.POSTLAYOUT:
          for (let i = 0; i < this.items.length; i++) this.items[i].postLayout();
          break;
      }
    }
  }

  static start(node, curve, duration, collectFn) {

    // collect changed properties, layout changes, etc..
    assert(!Animation.animation, 'Cannot start an animation while an other is still collecting');
    const animation = animationsPool.pop() || new LayoutAnimation();
    animation.items = [];
    animation.state = State.INIT;
    animation.progress = 0;
    Animation.animation = animation;
    collectFn();
    node.requestLayout();
    Animation.animation = undefined;

    animation.promise = new AnimationPromise((resolve) => {
      animation.start(node, curve, duration, () => {
        animation.stop();
        resolve(true);
      });
    });
    animation.promise.then((done) => {
      if (!done) animation.stop(true);
    });
    return animation;
  }
}
LayoutAnimation.State = State;
